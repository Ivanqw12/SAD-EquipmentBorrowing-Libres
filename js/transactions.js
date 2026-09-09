/* ============================================================
   js/transactions.js
   Borrowing Transactions Module
   - Record borrowing (BR-03, BR-04, BR-05, BR-06, BR-07, BR-11)
   - Return equipment (BR-08, BR-12)
   - Overdue detection (BR-09)
   - Search, filter, edit, delete
   ============================================================ */

let transactionList = [];
let equipmentMap = {}; // id -> equipment record
let editingTxId = null;

function initTransactions() {
  const modal = document.getElementById("borrow-modal");

  document.getElementById("record-borrow-btn").addEventListener("click", function () {
    openBorrowModal(null);
  });

  document.getElementById("bx-cancel-btn").addEventListener("click", function () {
    modal.classList.remove("show");
  });
  modal.addEventListener("click", function (event) {
    if (event.target === modal) modal.classList.remove("show");
  });

  document.getElementById("bx-save-btn").addEventListener("click", saveTransaction);

  // Live search + status filter
  document.getElementById("tx-search").addEventListener("input", renderTransactions);
  document.getElementById("tx-filter").addEventListener("change", renderTransactions);

  // Row actions (event delegation)
  const tbody = document.getElementById("transactions-table");
  tbody.addEventListener("click", function (event) {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));
    const record = transactionList.find(function (t) { return t.id === id; });
    if (!record) return;

    const action = btn.getAttribute("data-action");
    if (action === "return") {
      returnEquipment(record);
    } else if (action === "edit") {
      openBorrowModal(record);
    } else if (action === "delete") {
      askDeleteConfirmation(
        "Delete transaction #" + id + "?",
        "This borrowing transaction will be permanently removed. Required confirmation. Equipment availability will be re-checked.",
        function () { deleteTransaction(record); }
      );
    }
  });

  loadTransactions();
}

/* ---------- Fetch + join with equipment ---------- */
async function loadTransactions() {
  if (!window.supabaseClient) return;

  const [txRes, eqRes] = await Promise.all([
    window.supabaseClient.from("borrow_transactions").select("*").order("id", { ascending: false }),
    window.supabaseClient.from("equipment").select("*"),
  ]);

  if (txRes.error || eqRes.error) {
    window.showError("Could not load transactions: " + getErrorMessage(txRes.error || eqRes.error));
    return;
  }

  transactionList = txRes.data || [];
  equipmentMap = {};
  (eqRes.data || []).forEach(function (e) { equipmentMap[e.id] = e; });

  // Attach a handy display name
  transactionList.forEach(function (t) {
    t.equipment_name = equipmentMap[t.equipment_id] ? equipmentMap[t.equipment_id].equipment_name : "Unknown";
    t.asset_code = equipmentMap[t.equipment_id] ? equipmentMap[t.equipment_id].asset_code : "";
  });

  await updateOverdueStatuses();
  renderTransactions();
}

/* ---------- Overdue detection (BR-09) ---------- */
async function updateOverdueStatuses() {
  const today = window.todayStr();
  const updates = [];

  transactionList.forEach(function (t) {
    if (t.status === "Returned") return;
    if (t.due_date && today > t.due_date && t.status !== "Overdue") {
      updates.push({ id: t.id, status: "Overdue" });
      t.status = "Overdue";
    } else if (t.due_date && today <= t.due_date && t.status === "Overdue") {
      updates.push({ id: t.id, status: "Borrowed" });
      t.status = "Borrowed";
    }
  });

  for (const u of updates) {
    await window.supabaseClient.from("borrow_transactions").update({ status: u.status }).eq("id", u.id);
  }
}

/* ---------- Render with search + filter ---------- */
function renderTransactions() {
  const tbody = document.getElementById("transactions-table");
  const search = (document.getElementById("tx-search").value || "").toLowerCase().trim();
  const filter = document.getElementById("tx-filter").value;

  const filtered = transactionList.filter(function (t) {
    const matchesSearch =
      !search ||
      (t.equipment_name && t.equipment_name.toLowerCase().includes(search)) ||
      (t.asset_code && t.asset_code.toLowerCase().includes(search)) ||
      (t.borrower_name && t.borrower_name.toLowerCase().includes(search));
    const matchesStatus = filter === "All" || t.status === filter;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No transactions found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map(function (t) {
      let actions = "";
      if (t.status === "Borrowed" || t.status === "Overdue") {
        actions =
          '<button class="btn btn-success btn-small" data-action="return" data-id="' + t.id + '">Return Equipment</button> ' +
          '<button class="btn btn-outline btn-small" data-action="edit" data-id="' + t.id + '">Edit</button>';
      } else {
        actions = '<span style="color:#94a3b8;font-size:12px;">Completed</span> ';
      }
      actions += '<button class="btn btn-danger btn-small" data-action="delete" data-id="' + t.id + '">Delete</button>';

      return (
        "<tr>" +
          "<td><strong>" + escapeHtml(t.equipment_name) + "</strong><br /><span style='color:#94a3b8;font-size:11px;'>" + escapeHtml(t.asset_code) + "</span></td>" +
          "<td>" + escapeHtml(t.borrower_name) + "</td>" +
          "<td>" + escapeHtml(t.borrower_type) + "</td>" +
          "<td>" + escapeHtml(t.department) + "</td>" +
          "<td>" + window.formatDate(t.date_borrowed) + "</td>" +
          "<td>" + window.formatDate(t.due_date) + "</td>" +
          "<td>" + window.formatDate(t.date_returned) + "</td>" +
          "<td>" + window.statusBadge(t.status) + "</td>" +
          "<td>" + actions + "</td>" +
        "</tr>"
      );
    })
    .join("");
}

/* ---------- Borrow modal: open / close ---------- */
async function openBorrowModal(record) {
  window.clearAlerts();
  editingTxId = record ? record.id : null;

  document.getElementById("borrow-modal-title").textContent = record ? "Edit Borrowing Transaction" : "Record Borrowing";
  document.getElementById("bx-borrower").value = record ? record.borrower_name : "";
  document.getElementById("bx-borrower-type").value = record ? record.borrower_type : "Student";
  document.getElementById("bx-department").value = record ? record.department : "";
  document.getElementById("bx-date-borrowed").value = record ? record.date_borrowed : window.todayStr();
  document.getElementById("bx-due-date").value = record ? record.due_date : "";
  document.getElementById("bx-due-date").min = document.getElementById("bx-date-borrowed").value;

  // Populate equipment selector with available items (BR-03)
  // When editing, keep the currently borrowed item selectable.
  const select = document.getElementById("bx-equipment");
  const options = [];
  let firstValue = "";
  Object.keys(equipmentMap).forEach(function (key) {
    const e = equipmentMap[key];
    const isAvailable = e.availability === "Available";
    const isCurrent = record && record.equipment_id === e.id;
    if (isAvailable || isCurrent) {
      if (!firstValue) firstValue = e.id;
      options.push(
        '<option value="' + e.id + '"' + (isCurrent ? " selected" : "") + '>' +
        escapeHtml(e.asset_code + " — " + e.equipment_name) +
        "</option>"
      );
    }
  });
  select.innerHTML = options.length ? options.join("") : '<option value="">No available equipment</option>';
  if (!record) select.value = options.length ? firstValue : "";

  document.getElementById("borrow-modal").classList.add("show");
  document.getElementById("bx-borrower").focus();
}

/* ---------- Create / Update transaction ---------- */
async function saveTransaction() {
  const borrowerName = document.getElementById("bx-borrower").value.trim();
  const borrowerType = document.getElementById("bx-borrower-type").value;
  const department = document.getElementById("bx-department").value.trim();
  const equipmentId = Number(document.getElementById("bx-equipment").value);
  const dateBorrowed = document.getElementById("bx-date-borrowed").value;
  const dueDate = document.getElementById("bx-due-date").value;

  // BR-04: borrower name must be provided
  if (!borrowerName) {
    window.showError("Borrower name must be provided.");
    return;
  }
  if (!department) {
    window.showError("Department must be provided.");
    return;
  }
  if (!equipmentId) {
    window.showError("Please select an equipment.");
    return;
  }
  if (!dateBorrowed || !dueDate) {
    window.showError("Borrowing and due dates are required.");
    return;
  }
  // BR-05: due date cannot be earlier than the borrowing date
  if (dueDate < dateBorrowed) {
    window.showError("Due date cannot be earlier than the borrowing date.");
    return;
  }

  if (editingTxId === null) {
    // New borrowing -> only available equipment is allowed (BR-03)
    const equipment = equipmentMap[equipmentId];
    if (!equipment || equipment.availability !== "Available") {
      window.showError("Only available equipment may be borrowed (BR-03). This item is already borrowed.");
      return;
    }

    // Create transaction: status Borrowed (BR-06), equipment becomes Borrowed (BR-07)
    const { data, error } = await window.supabaseClient.from("borrow_transactions").insert([
      {
        equipment_id: equipmentId,
        borrower_name: borrowerName,
        borrower_type: borrowerType,
        department: department,
        date_borrowed: dateBorrowed,
        due_date: dueDate,
        status: "Borrowed",
      },
    ]).select();

    if (error) {
      window.showError("Could not record borrowing: " + getErrorMessage(error));
      return;
    }

    const { error: eqError } = await window.supabaseClient
      .from("equipment")
      .update({ availability: "Borrowed" })
      .eq("id", equipmentId);
    if (eqError) {
      window.showError("Transaction saved, but equipment availability could not be updated: " + getErrorMessage(eqError));
    }
  } else {
    // Edit transaction: allowed only while not returned (BR-12)
    const existing = transactionList.find(function (t) { return t.id === editingTxId; });
    if (!existing || existing.status === "Returned") {
      window.showError("A returned transaction cannot be edited.");
      return;
    }

    // Recompute status based on dates (BR-09)
    let newStatus = "Borrowed";
    const today = window.todayStr();
    if (dueDate < today) newStatus = "Overdue";

    const { error } = await window.supabaseClient
      .from("borrow_transactions")
      .update({
        borrower_name: borrowerName,
        borrower_type: borrowerType,
        department: department,
        equipment_id: equipmentId,
        date_borrowed: dateBorrowed,
        due_date: dueDate,
        status: newStatus,
      })
      .eq("id", editingTxId);

    if (error) {
      window.showError("Could not update transaction: " + getErrorMessage(error));
      return;
    }

    // Sync equipment availability if the equipment changed
    if (existing.equipment_id !== equipmentId) {
      await syncEquipmentAvailability(existing.equipment_id);
      await window.supabaseClient.from("equipment").update({ availability: "Borrowed" }).eq("id", equipmentId);
    }
  }

  document.getElementById("borrow-modal").classList.remove("show");
  await loadTransactions();
  loadDashboard();
}

/* ---------- Return equipment (BR-08, BR-12) ---------- */
async function returnEquipment(record) {
  if (record.status === "Returned") {
    window.showError("This transaction has already been returned and cannot be returned again.");
    return;
  }

  const today = window.todayStr();
  const { error } = await window.supabaseClient
    .from("borrow_transactions")
    .update({ date_returned: today, status: "Returned" })
    .eq("id", record.id);

  if (error) {
    window.showError("Could not process return: " + getErrorMessage(error));
    return;
  }

  const { error: eqError } = await window.supabaseClient
    .from("equipment")
    .update({ availability: "Available" })
    .eq("id", record.equipment_id);

  if (eqError) {
    window.showError("Return recorded, but equipment availability could not be updated: " + getErrorMessage(eqError));
  }

  await loadTransactions();
  loadDashboard();
}

/* ---------- Delete transaction ---------- */
async function deleteTransaction(record) {
  const { error } = await window.supabaseClient.from("borrow_transactions").delete().eq("id", record.id);
  if (error) {
    window.showError("Could not delete transaction: " + getErrorMessage(error));
    return;
  }
  await syncEquipmentAvailability(record.equipment_id);
  await loadTransactions();
  loadDashboard();
}

/* ---------- Recompute equipment availability from live transactions ---------- */
async function syncEquipmentAvailability(equipmentId) {
  const { data, error } = await window.supabaseClient
    .from("borrow_transactions")
    .select("status")
    .eq("equipment_id", equipmentId)
    .in("status", ["Borrowed", "Overdue"]);

  if (error) return;

  const availability = data && data.length > 0 ? "Borrowed" : "Available";
  await window.supabaseClient.from("equipment").update({ availability: availability }).eq("id", equipmentId);
}

window.initTransactions = initTransactions;
window.loadTransactions = loadTransactions;
window.syncEquipmentAvailability = syncEquipmentAvailability;