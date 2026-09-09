/* ============================================================
   js/equipment.js
   Equipment Module - CRUD + Search + Filter + Dashboard stats
   ============================================================ */

let equipmentList = [];
let editingEquipmentId = null;

function initEquipment() {
  const modal = document.getElementById("equipment-modal");

  // Open "Add Equipment"
  document.getElementById("add-equipment-btn").addEventListener("click", function () {
    openEquipmentModal(null);
  });

  // Cancel / close
  document.getElementById("eq-cancel-btn").addEventListener("click", function () {
    modal.classList.remove("show");
  });
  modal.addEventListener("click", function (event) {
    if (event.target === modal) modal.classList.remove("show");
  });

  // Save (BR-01, BR-02, BR-10)
  document.getElementById("eq-save-btn").addEventListener("click", saveEquipment);

  // Live search (equipment name / asset code)
  document.getElementById("eq-search").addEventListener("input", renderEquipment);
  // Availability filter
  document.getElementById("eq-filter").addEventListener("change", renderEquipment);

  // Row action buttons (event delegation)
  const tbody = document.getElementById("equipment-table");
  tbody.addEventListener("click", function (event) {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));

    if (btn.getAttribute("data-action") === "edit") {
      const record = equipmentList.find(function (e) { return e.id === id; });
      if (record) openEquipmentModal(record);
    } else if (btn.getAttribute("data-action") === "delete") {
      const record = equipmentList.find(function (e) { return e.id === id; });
      askDeleteConfirmation(
        "Delete " + (record ? record.equipment_name : "this equipment") + "?",
        "This equipment record will be permanently removed. This action requires confirmation and cannot be undone.",
        function () { deleteEquipment(id); }
      );
    }
  });

  loadEquipment();
}

/* ---------- Fetch + render ---------- */
async function loadEquipment() {
  if (!window.supabaseClient) return;
  const { data, error } = await window.supabaseClient
    .from("equipment")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    window.showError("Could not load equipment: " + getErrorMessage(error));
    return;
  }
  equipmentList = data || [];
  renderEquipment();
}

function renderEquipment() {
  const tbody = document.getElementById("equipment-table");
  const search = (document.getElementById("eq-search").value || "").toLowerCase().trim();
  const filter = document.getElementById("eq-filter").value;

  const filtered = equipmentList.filter(function (e) {
    const matchesSearch =
      !search ||
      e.equipment_name.toLowerCase().includes(search) ||
      e.asset_code.toLowerCase().includes(search);
    const matchAvail = filter === "All" || e.availability === filter;
    return matchesSearch && matchAvail;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No equipment records found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map(function (e) {
      const availBadge =
        e.availability === "Available"
          ? '<span class="badge badge-available">Available</span>'
          : '<span class="badge badge-borrowed">Borrowed</span>';
      return (
        "<tr>" +
          "<td><strong>" + escapeHtml(e.asset_code) + "</strong></td>" +
          "<td>" + escapeHtml(e.equipment_name) + "</td>" +
          "<td>" + escapeHtml(e.category) + "</td>" +
          "<td>" + escapeHtml(e.condition) + "</td>" +
          "<td>" + availBadge + "</td>" +
          "<td>" +
            '<button class="btn btn-outline btn-small" data-action="edit" data-id="' + e.id + '">Edit</button> ' +
            '<button class="btn btn-danger btn-small" data-action="delete" data-id="' + e.id + '">Delete</button>' +
          "</td>" +
        "</tr>"
      );
    })
    .join("");
}

/* ---------- Modal: open / close ---------- */
function openEquipmentModal(record) {
  window.clearAlerts();
  editingEquipmentId = record ? record.id : null;

  document.getElementById("equipment-modal-title").textContent = record ? "Edit Equipment" : "Add Equipment";
  document.getElementById("eq-name").value = record ? record.equipment_name : "";
  document.getElementById("eq-category").value = record ? record.category : "Laptop";
  document.getElementById("eq-asset-code").value = record ? record.asset_code : "";
  document.getElementById("eq-condition").value = record ? record.condition : "Good";

  document.getElementById("equipment-modal").classList.add("show");
  document.getElementById("eq-name").focus();
}

/* ---------- Create / Update (BR-01, BR-02) ---------- */
async function saveEquipment() {
  const name = document.getElementById("eq-name").value.trim();
  const category = document.getElementById("eq-category").value;
  const assetCode = document.getElementById("eq-asset-code").value.trim();
  const condition = document.getElementById("eq-condition").value;

  // BR-01: equipment name cannot be empty
  if (!name) {
    window.showError("Equipment name cannot be empty.");
    return;
  }
  // Asset code is required
  if (!assetCode) {
    window.showError("Asset code cannot be empty.");
    return;
  }

  // BR-02: asset code must be unique
  const duplicate = equipmentList.find(function (e) {
    return e.asset_code.toLowerCase() === assetCode.toLowerCase() && e.id !== editingEquipmentId;
  });
  if (duplicate) {
    window.showError("Asset code \"" + assetCode + "\" already exists. Asset codes must be unique (BR-02).");
    return;
  }

  const payload = {
    equipment_name: name,
    category: category,
    asset_code: assetCode,
    condition: condition,
  };

  let result;
  if (editingEquipmentId === null) {
    result = await window.supabaseClient.from("equipment").insert({ ...payload, availability: "Available" });
  } else {
    result = await window.supabaseClient.from("equipment").update(payload).eq("id", editingEquipmentId);
  }

  if (result.error) {
    window.showError("Could not save equipment: " + getErrorMessage(result.error));
    return;
  }

  document.getElementById("equipment-modal").classList.remove("show");
  await loadEquipment();
  loadDashboard();
}

/* ---------- Delete (BR-10: confirmation) ---------- */
async function deleteEquipment(id) {
  // Check whether this equipment currently has a Borrowed/Overdue transaction.
  const { data: active, error: activeError } = await window.supabaseClient
    .from("borrow_transactions")
    .select("id")
    .eq("equipment_id", id)
    .in("status", ["Borrowed", "Overdue"]);

  if (activeError) {
    window.showError("Could not check equipment status: " + getErrorMessage(activeError));
    return;
  }
  if (active && active.length > 0) {
    window.showError("This equipment is currently borrowed and cannot be deleted.");
    return;
  }

  const { error } = await window.supabaseClient.from("equipment").delete().eq("id", id);
  if (error) {
    window.showError("Could not delete equipment: " + getErrorMessage(error));
    return;
  }

  await loadEquipment();
  loadDashboard();
}

/* ---------- Dashboard stats ---------- */
async function loadDashboard() {
  if (!window.supabaseClient) return;

  const [eqRes, txRes] = await Promise.all([
    window.supabaseClient.from("equipment").select("id, equipment_name, availability"),
    window.supabaseClient.from("borrow_transactions").select("*"),
  ]);

  if (eqRes.error || txRes.error) {
    window.showError("Could not load dashboard: " + getErrorMessage(eqRes.error || txRes.error));
    return;
  }

  const equipmentCol = eqRes.data || [];
  const txns = txRes.data || [];

  const today = window.todayStr();

  // Recompute effective status for open transactions (overdue detection BR-09)
  txns.forEach(function (t) {
    if (t.status !== "Returned" && t.date_returned) {
      // safety: mark returned if a return date exists
      t.status = "Returned";
    } else if (t.status !== "Returned" && t.due_date && today > t.due_date) {
      t.status = "Overdue";
    }
  });

  const total = equipmentCol.length;
  const available = equipmentCol.filter(function (e) { return e.availability === "Available"; }).length;
  const borrowed = txns.filter(function (t) { return t.status === "Borrowed" || t.status === "Overdue"; }).length;
  const returned = txns.filter(function (t) { return t.status === "Returned"; }).length;
  const overdue = txns.filter(function (t) { return t.status === "Overdue"; }).length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-available").textContent = available;
  document.getElementById("stat-borrowed").textContent = borrowed;
  document.getElementById("stat-returned").textContent = returned;
  document.getElementById("stat-overdue").textContent = overdue;

  // Overdue preview table (needs equipment names)
  const eqMap = {};
  equipmentCol.forEach(function (e) { eqMap[e.id] = e; });
  // Note: equipmentCol only has availability; fetch names once—but equipmentList
  // may not be loaded yet. Reuse list passed in below.
  renderOverduePreview(txns, eqMap);
}

function renderOverduePreview(txns, eqMap) {
  const tbody = document.getElementById("overdue-preview");
  const overdueTxns = txns.filter(function (t) { return t.status === "Overdue"; });

  if (overdueTxns.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No overdue transactions. Good job!</td></tr>';
    return;
  }

  tbody.innerHTML = overdueTxns
    .slice(0, 10)
    .map(function (t) {
      const eqName = t.equipment_name || (eqMap[t.equipment_id] ? eqMap[t.equipment_id].equipment_name : "Equipment #" + t.equipment_id);
      return (
        "<tr>" +
          "<td>" + escapeHtml(eqName) + "</td>" +
          "<td>" + escapeHtml(t.borrower_name) + "</td>" +
          "<td>" + escapeHtml(t.department) + "</td>" +
          "<td>" + window.formatDate(t.due_date) + "</td>" +
        "</tr>"
      );
    })
    .join("");
}

/* ---------- Shared helpers (also used by transactions.js) ---------- */
function statusBadge(status) {
  const map = {
    Available: '<span class="badge badge-available">Available</span>',
    Borrowed: '<span class="badge badge-borrowed">Borrowed</span>',
    Returned: '<span class="badge badge-returned">Returned</span>',
    Overdue: '<span class="badge badge-overdue">Overdue</span>',
  };
  return map[status] || escapeHtml(status);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

window.statusBadge = statusBadge;
window.escapeHtml = escapeHtml;
window.loadEquipment = loadEquipment;
window.loadDashboard = loadDashboard;