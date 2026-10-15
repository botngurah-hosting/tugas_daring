let adminToken = localStorage.getItem("adminToken");
let currentTasksCache = [];

document.addEventListener("DOMContentLoaded", () => {
  if (adminToken) {
    showDashboard();
  } else {
    document.getElementById("loginCard").style.display = "block";
    document.getElementById("dashboardSection").style.display = "none";
  }

  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("btnLogout").addEventListener("click", handleLogout);
  document
    .getElementById("createTaskForm")
    .addEventListener("submit", handleCreateTask);
  document
    .getElementById("editTaskForm")
    .addEventListener("submit", handleUpdateTask);
});

async function apiRequest(payload) {
  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return await response.json();
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById("adminUsername").value;
  const p = document.getElementById("adminPassword").value;
  const alertDiv = document.getElementById("loginAlert");

  if (!u) {
    alertDiv.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Silakan pilih akun pengajar terlebih dahulu.</div>`;
    return;
  }

  alertDiv.innerHTML = `<div class="alert alert-info"><i class="fa-solid fa-circle-notch fa-spin"></i> Memeriksa kredensial password...</div>`;

  try {
    const res = await apiRequest({
      action: "adminLogin",
      username: u,
      password: p,
    });
    if (res.success) {
      adminToken = res.token;
      localStorage.setItem("adminToken", adminToken);
      showDashboard();
    } else {
      alertDiv.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> ${res.message}</div>`;
    }
  } catch (err) {
    alertDiv.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> Gagal login. Periksa koneksi internet Anda.</div>`;
  }
}

function handleLogout() {
  localStorage.removeItem("adminToken");
  location.reload();
}

function showDashboard() {
  document.getElementById("loginCard").style.display = "none";

  const dash = document.getElementById("dashboardSection");
  dash.style.display = "flex";
  dash.style.flexDirection = "column";
  dash.style.gap = "1.8rem";

  document.getElementById("btnLogout").style.display = "inline-flex";
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const res = await apiRequest({
      action: "getAdminDashboard",
      token: adminToken,
    });
    if (!res.success) {
      alert(res.message);
      handleLogout();
      return;
    }

    currentTasksCache = res.tasks || [];

    // Dropdown Kelas Tujuan
    const kelasSelect = document.getElementById("kelasTujuan");
    const editKelasSelect = document.getElementById("editKelasTujuan");
    kelasSelect.innerHTML = "";
    editKelasSelect.innerHTML = "";

    const allSdClasses = [
      "Kelas 1",
      "Kelas 2",
      "Kelas 3",
      "Kelas 4",
      "Kelas 5",
      "Kelas 6",
    ];
    const allowedClasses = res.allowedClasses || [];

    if (allowedClasses.includes("ALL")) {
      allSdClasses.forEach((k) => {
        kelasSelect.innerHTML += `<option value="${k}">${k}</option>`;
        editKelasSelect.innerHTML += `<option value="${k}">${k}</option>`;
      });
      kelasSelect.innerHTML += `<option value="Semua Kelas">Semua Kelas (1 - 6)</option>`;
      editKelasSelect.innerHTML += `<option value="Semua Kelas">Semua Kelas (1 - 6)</option>`;
    } else {
      allowedClasses.forEach((k) => {
        kelasSelect.innerHTML += `<option value="${k}">${k}</option>`;
        editKelasSelect.innerHTML += `<option value="${k}">${k}</option>`;
      });
    }

    // Storage Info
    const storage = res.storage;
    const usedMb = (storage.usedBytes / (1024 * 1024)).toFixed(1);
    const maxGb = (storage.maxBytes / (1024 * 1024 * 1024)).toFixed(1);
    document.getElementById("storageText").innerText =
      `Terpakai ${usedMb} MB dari ${maxGb} GB (${storage.percentage}%)`;

    const bar = document.getElementById("storageProgressBar");
    bar.style.width = `${storage.percentage}%`;
    if (storage.percentage >= 80) {
      bar.style.background = "var(--danger-500)";
    } else {
      bar.style.background =
        "linear-gradient(90deg, var(--primary-600), var(--primary-500))";
    }

    // 1. Render Tabel Daftar Tugas
    const taskTbody = document.getElementById("taskTableBody");
    taskTbody.innerHTML = "";
    if (currentTasksCache.length === 0) {
      taskTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--neutral-500);">Belum ada tugas yang dibuat.</td></tr>`;
    } else {
      currentTasksCache.forEach((t) => {
        const isAktif = t.status === "Aktif";
        const statusBadge = isAktif
          ? `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Aktif</span>`
          : `<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> Ditutup</span>`;

        taskTbody.innerHTML += `
          <tr>
            <td style="font-weight:700;">${t.id}</td>
            <td>${t.tanggal}</td>
            <td style="font-weight:700; color:var(--neutral-900);">${t.judul}</td>
            <td><span class="user-badge-item">${t.kelas}</span></td>
            <td style="color:var(--danger-600); font-weight:600;">${t.deadline}</td>
            <td>
              <a href="https://drive.google.com/drive/u/0/folders/${t.folderId}" target="_blank" style="color:var(--primary-600); font-weight:700; text-decoration:none;">
                <i class="fa-solid fa-folder-open"></i> Buka Drive
              </a>
            </td>
            <td>${statusBadge}</td>
            <td>
              <div class="action-btn-group">
                <button class="btn btn-outline-secondary btn-sm" onclick="openEditModal('${t.id}')" title="Edit Tugas">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="toggleTaskStatus('${t.id}', '${isAktif ? "Tutup" : "Aktif"}')" title="${isAktif ? "Tutup Tugas" : "Aktifkan Tugas"}">
                  <i class="fa-solid ${isAktif ? "fa-lock" : "fa-lock-open"}"></i>
                </button>
                <button class="btn btn-outline-secondary btn-sm btn-delete-action" onclick="deleteTask('${t.id}', '${t.folderId}')" title="Hapus Tugas & Folder">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    }

    // 2. Render Tabel Daftar Pengumpulan Tugas Siswa
    const subTbody = document.getElementById("submissionTableBody");
    subTbody.innerHTML = "";
    if (!res.submissions || res.submissions.length === 0) {
      subTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--neutral-500);">Belum ada pengumpulan tugas dari siswa.</td></tr>`;
    } else {
      res.submissions.forEach((s) => {
        const sizeMb = (s.fileSize / (1024 * 1024)).toFixed(2);
        const statusBadge = `<span class="badge badge-success"><i class="fa-solid fa-paper-plane"></i> Terkirim</span>`;

        subTbody.innerHTML += `
          <tr>
            <td style="font-size:0.8rem; color:var(--neutral-500);">${s.time}</td>
            <td style="font-weight:700; color:var(--neutral-900);">${s.nama} <small style="color:var(--neutral-500); font-weight:normal;">(${s.nis || "-"})</small></td>
            <td><span class="user-badge-item">${s.kelas}</span></td>
            <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${s.fileName}">${s.fileName}</td>
            <td>${sizeMb} MB</td>
            <td>
              <a href="${s.driveLink}" target="_blank" style="color:var(--primary-600); font-weight:700; text-decoration:none;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Unduh/Lihat
              </a>
            </td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn btn-outline-secondary btn-sm btn-delete-action" onclick="deleteFile(${s.rowIndex}, '${s.subId}')" title="Hapus File dari Drive & Sheet">
                <i class="fa-solid fa-trash"></i> Hapus
              </button>
            </td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleCreateTask(e) {
  e.preventDefault();
  const alertDiv = document.getElementById("createTaskAlert");
  alertDiv.innerHTML = `<div class="alert alert-info"><i class="fa-solid fa-circle-notch fa-spin"></i> Membuat tugas & folder Google Drive...</div>`;

  const payload = {
    action: "createTask",
    token: adminToken,
    tanggalTugas: document.getElementById("tanggalTugas").value,
    kelasTujuan: document.getElementById("kelasTujuan").value,
    judulTugas: document.getElementById("judulTugas").value,
    deskripsi: document.getElementById("deskripsiTugas").value,
    deadline:
      document.getElementById("deadlineTugas").value.replace("T", " ") + ":00",
  };

  const res = await apiRequest(payload);
  if (res.success) {
    alertDiv.innerHTML = `<div class="alert alert-success"><i class="fa-solid fa-circle-check"></i> ${res.message}</div>`;
    document.getElementById("createTaskForm").reset();
    loadDashboardData();
  } else {
    alertDiv.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> ${res.message}</div>`;
  }
}

// Open & Close Edit Modal
function openEditModal(taskId) {
  const task = currentTasksCache.find((t) => t.id === taskId);
  if (!task) return;

  document.getElementById("editTaskId").value = task.id;
  document.getElementById("editTanggalTugas").value = task.tanggal;
  document.getElementById("editKelasTujuan").value = task.kelas;
  document.getElementById("editJudulTugas").value = task.judul;
  document.getElementById("editDeskripsiTugas").value = task.deskripsi;

  if (task.deadline) {
    document.getElementById("editDeadlineTugas").value = task.deadline
      .replace(" ", "T")
      .substring(0, 16);
  }

  document.getElementById("editTaskAlert").innerHTML = "";
  document.getElementById("editTaskModal").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("editTaskModal").style.display = "none";
}

async function handleUpdateTask(e) {
  e.preventDefault();
  const alertDiv = document.getElementById("editTaskAlert");
  alertDiv.innerHTML = `<div class="alert alert-info"><i class="fa-solid fa-circle-notch fa-spin"></i> Menyimpan perubahan...</div>`;

  const payload = {
    action: "updateTask",
    token: adminToken,
    taskId: document.getElementById("editTaskId").value,
    tanggalTugas: document.getElementById("editTanggalTugas").value,
    kelasTujuan: document.getElementById("editKelasTujuan").value,
    judulTugas: document.getElementById("editJudulTugas").value,
    deskripsi: document.getElementById("editDeskripsiTugas").value,
    deadline:
      document.getElementById("editDeadlineTugas").value.replace("T", " ") +
      ":00",
  };

  const res = await apiRequest(payload);
  if (res.success) {
    alertDiv.innerHTML = `<div class="alert alert-success"><i class="fa-solid fa-circle-check"></i> ${res.message}</div>`;
    setTimeout(() => {
      closeEditModal();
      loadDashboardData();
    }, 1200);
  } else {
    alertDiv.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> ${res.message}</div>`;
  }
}

async function toggleTaskStatus(taskId, newStatus) {
  if (
    !confirm(
      `Apakah Anda yakin ingin mengubah status tugas menjadi ${newStatus}?`,
    )
  )
    return;
  const res = await apiRequest({
    action: "updateTaskStatus",
    token: adminToken,
    taskId: taskId,
    status: newStatus,
  });
  if (res.success) {
    loadDashboardData();
  }
}

// Hapus Tugas Beserta Foldernya di Drive
async function deleteTask(taskId, folderId) {
  if (
    !confirm(
      "PERINGATAN: Menghapus tugas ini juga akan memindahkan folder terkait di Google Drive ke tempat sampah. Lanjutkan?",
    )
  )
    return;

  const res = await apiRequest({
    action: "deleteTask",
    token: adminToken,
    taskId: taskId,
    folderId: folderId,
  });

  if (res.success) {
    alert(res.message);
    loadDashboardData();
  } else {
    alert(res.message);
  }
}

// FUNGSI HAPUS PENGUMPULAN TUGAS SISWA
async function deleteFile(rowIndex, subId) {
  if (
    !confirm(
      "Apakah Anda yakin ingin menghapus file ini dari Google Drive dan menghapus baris datanya dari sheet pengumpulan?",
    )
  )
    return;

  const res = await apiRequest({
    action: "deleteSubmissionFile",
    token: adminToken,
    rowIndex: rowIndex,
    subId: subId,
  });

  if (res.success) {
    alert(res.message);
    loadDashboardData();
  } else {
    alert(res.message);
  }
}
