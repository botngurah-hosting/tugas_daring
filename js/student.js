let currentStudent = null;
let selectedFilesArr = [];

document.addEventListener("DOMContentLoaded", () => {
  if (typeof CONFIG !== "undefined" && CONFIG.SCHOOL_NAME) {
    document.getElementById("schoolNameHeader").innerText = CONFIG.SCHOOL_NAME;
  }
  loadInitialClasses();

  document
    .getElementById("selectKelas")
    .addEventListener("change", handleClassChange);
  document
    .getElementById("selectSiswa")
    .addEventListener("change", handleStudentChange);
  document
    .getElementById("identityForm")
    .addEventListener("submit", handleIdentitySubmit);
  document
    .getElementById("btnChangeIdentity")
    .addEventListener("click", resetIdentity);
  document
    .getElementById("btnBackToTasks")
    .addEventListener("click", showTaskList);

  setupDropzone();
  document
    .getElementById("uploadForm")
    .addEventListener("submit", handleUploadTask);
});

async function apiRequest(payload) {
  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return await response.json();
}

function updateStepTracker(stepNumber) {
  const s1 = document.getElementById("stepIndicator1");
  const s2 = document.getElementById("stepIndicator2");
  const s3 = document.getElementById("stepIndicator3");
  const l1 = document.getElementById("stepLine1");
  const l2 = document.getElementById("stepLine2");

  [s1, s2, s3].forEach((s) => s?.classList.remove("active", "completed"));
  [l1, l2].forEach((l) => l?.classList.remove("active"));

  if (stepNumber === 1) {
    s1?.classList.add("active");
  } else if (stepNumber === 2) {
    s1?.classList.add("completed");
    s2?.classList.add("active");
    l1?.classList.add("active");
  } else if (stepNumber === 3) {
    s1?.classList.add("completed");
    s2?.classList.add("completed");
    s3?.classList.add("active");
    l1?.classList.add("active");
    l2?.classList.add("active");
  }
}

async function loadInitialClasses() {
  const selectKelas = document.getElementById("selectKelas");
  try {
    const res = await apiRequest({ action: "getInitialData" });
    if (res.success) {
      selectKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>';
      res.classes.forEach((k) => {
        selectKelas.innerHTML += `<option value="${k}">${k}</option>`;
      });
    }
  } catch (err) {
    document.getElementById("identityAlert").innerHTML =
      `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> Gagal terhubung ke server backend.</div>`;
  }
}

async function handleClassChange(e) {
  const selectedClass = e.target.value;
  const selectSiswa = document.getElementById("selectSiswa");
  const btnLogin = document.getElementById("btnStudentLogin");
  const alertDiv = document.getElementById("identityAlert");

  btnLogin.disabled = true;

  if (!selectedClass) {
    selectSiswa.innerHTML =
      '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>';
    selectSiswa.disabled = true;
    return;
  }

  selectSiswa.innerHTML = '<option value="">Memuat nama siswa...</option>';
  selectSiswa.disabled = true;
  alertDiv.innerHTML = "";

  try {
    const res = await apiRequest({
      action: "getStudentsByClass",
      kelas: selectedClass,
    });
    if (res.success && res.students.length > 0) {
      selectSiswa.innerHTML = '<option value="">-- Pilih Nama Anda --</option>';
      res.students.forEach((s) => {
        selectSiswa.innerHTML += `<option value="${s.nama}">${s.nama}</option>`;
      });
      selectSiswa.disabled = false;
    } else {
      selectSiswa.innerHTML =
        '<option value="">Tidak ada siswa aktif di kelas ini</option>';
    }
  } catch (err) {
    alertDiv.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> Gagal memuat daftar nama siswa.</div>`;
  }
}

function handleStudentChange(e) {
  const selectedStudent = e.target.value;
  const btnLogin = document.getElementById("btnStudentLogin");
  btnLogin.disabled = !selectedStudent;
}

async function handleIdentitySubmit(e) {
  e.preventDefault();
  const kelas = document.getElementById("selectKelas").value;
  const nama = document.getElementById("selectSiswa").value;
  const alertDiv = document.getElementById("identityAlert");

  alertDiv.innerHTML = `<div class="alert alert-info"><i class="fa-solid fa-circle-notch fa-spin"></i> Memverifikasi identitas...</div>`;

  try {
    const res = await apiRequest({
      action: "verifyStudentByName",
      nama: nama,
      kelas: kelas,
    });
    if (res.success) {
      currentStudent = res.student;
      alertDiv.innerHTML = "";

      document.getElementById("identitySection").style.display = "none";
      document.getElementById("taskSection").style.display = "block";

      document.getElementById("welcomeStudentTitle").innerText =
        `Halo, ${currentStudent.nama}`;

      const classBadge = document.getElementById("studentClassBadge");
      classBadge.innerHTML = `<i class="fa-solid fa-school"></i> Kelas ${currentStudent.kelas}`;

      const nisBadge = document.getElementById("studentNisBadge");
      if (currentStudent.nis) {
        nisBadge.style.display = "inline-flex";
        nisBadge.innerHTML = `<i class="fa-solid fa-hashtag"></i> NIS: ${currentStudent.nis}`;
      } else {
        nisBadge.style.display = "none";
      }

      updateStepTracker(2);
      loadStudentTasks();
    } else {
      alertDiv.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> ${res.message}</div>`;
    }
  } catch (err) {
    alertDiv.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> Terjadi kesalahan sistem.</div>`;
  }
}

function resetIdentity() {
  currentStudent = null;
  document.getElementById("identitySection").style.display = "block";
  document.getElementById("taskSection").style.display = "none";
  document.getElementById("uploadSection").style.display = "none";
  document.getElementById("identityForm").reset();
  document.getElementById("selectSiswa").disabled = true;
  document.getElementById("btnStudentLogin").disabled = true;
  updateStepTracker(1);
}

async function loadStudentTasks() {
  const container = document.getElementById("taskListContainer");
  container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--neutral-500);"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar tugas...</p>`;

  try {
    const res = await apiRequest({
      action: "getStudentTasks",
      kelas: currentStudent.kelas,
      nis: currentStudent.nis,
    });

    if (res.success && res.tasks.length > 0) {
      container.innerHTML = "";
      res.tasks.forEach((t) => {
        let badgeStatus = t.isPassedDeadline
          ? '<span class="badge badge-danger"><i class="fa-solid fa-clock"></i> Lewat Deadline</span>'
          : '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Terbuka</span>';
        let subInfo = "";

        if (t.submission) {
          badgeStatus =
            '<span class="badge badge-success"><i class="fa-solid fa-file-circle-check"></i> Sudah Mengumpulkan</span>';
          subInfo = `
            <div style="background: var(--neutral-100); padding: 0.75rem 0.85rem; border-radius: var(--radius-md); margin-top: 0.75rem; border-left: 3px solid var(--success-500);">
              <div style="color: var(--neutral-700); font-weight: 600; font-size: 0.82rem;">
                <i class="fa-regular fa-clock"></i> Dikirim: ${t.submission.time}
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.4rem; gap: 0.5rem; flex-wrap: wrap;">
                <a href="${t.submission.driveLink}" target="_blank" style="color: var(--primary-600); font-weight: 700; text-decoration: none; font-size: 0.85rem;">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Lihat File (${t.submission.fileName})
                </a>
                <button type="button" class="btn btn-outline-secondary btn-sm" style="color: var(--danger-600); border-color: var(--danger-500);" onclick="deleteMySubmission('${t.id}', '${t.submission.subId}')">
                  <i class="fa-solid fa-trash"></i> Hapus File
                </button>
              </div>
            </div>
          `;
        }

        const card = document.createElement("div");
        card.className = "card-section";
        card.style.padding = "1.25rem";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.justifyContent = "space-between";

        card.innerHTML = `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-size: 0.8rem; color: var(--neutral-500);"><i class="fa-regular fa-calendar"></i> ${t.tanggal}</span>
              ${badgeStatus}
            </div>
            <h3 style="font-size: 1.1rem; color: var(--neutral-900); margin-bottom: 0.5rem; font-weight: 700;">${t.judul}</h3>
            <p style="font-size: 0.88rem; color: var(--neutral-600); margin-bottom: 0.75rem; line-height: 1.5;">${t.deskripsi}</p>
            
            <div style="font-size: 0.8rem; color: var(--neutral-500); margin-bottom: 0.25rem;">
              <i class="fa-solid fa-user-tie"></i> Guru: <strong>${t.guru}</strong>
            </div>
            <div style="font-size: 0.8rem; color: var(--danger-600); font-weight: 600;">
              <i class="fa-regular fa-clock"></i> Deadline: ${t.deadline}
            </div>

            ${subInfo}
          </div>

          <div style="margin-top: 1.25rem;">
            <button class="btn ${t.submission ? "btn-outline-secondary" : "btn-primary"} btn-block" onclick="openUploadForm('${t.id}', '${t.judul.replace(/'/g, "\\'")}', '${t.deskripsi.replace(/'/g, "\\'")}', '${t.folderId}')">
              <i class="fa-solid ${t.submission ? "fa-pen-to-square" : "fa-cloud-arrow-up"}"></i>
              ${t.submission ? "Kirim Ulang / Tambah File" : "Kumpulkan Tugas"}
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--neutral-500); padding: 2rem;">Belum ada tugas aktif yang tersedia untuk kelas Anda saat ini.</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="alert alert-danger" style="grid-column: 1/-1;">Gagal memuat daftar tugas.</p>`;
  }
}

// Fitur Siswa Hapus File Tugas Terkirim Dari Drive
async function deleteMySubmission(taskId, subId) {
  if (
    !confirm(
      "Apakah Anda yakin ingin menghapus file tugas yang sudah dikumpulkan ini dari Google Drive?",
    )
  ) {
    return;
  }

  try {
    const res = await apiRequest({
      action: "deleteStudentSubmission",
      nis: currentStudent.nis,
      kelas: currentStudent.kelas,
      taskId: taskId,
      subId: subId,
    });

    if (res.success) {
      alert(res.message);
      loadStudentTasks();
    } else {
      alert(res.message);
    }
  } catch (err) {
    alert("Gagal menghapus file tugas. Silakan periksa koneksi internet Anda.");
  }
}

function showTaskList() {
  document.getElementById("taskSection").style.display = "block";
  document.getElementById("uploadSection").style.display = "none";
  updateStepTracker(2);
}

function openUploadForm(taskId, judul, deskripsi, folderId) {
  document.getElementById("taskSection").style.display = "none";
  document.getElementById("uploadSection").style.display = "block";
  document.getElementById("uploadTaskTitle").innerText = `Kumpulkan: ${judul}`;
  document.getElementById("uploadTaskDesc").innerText = deskripsi;
  document.getElementById("currentTaskId").value = taskId;
  document.getElementById("currentFolderId").value = folderId;
  document.getElementById("uploadStatusAlert").innerHTML = "";

  selectedFilesArr = [];
  document.getElementById("inputFile").value = "";
  renderFilePreview();

  updateStepTracker(3);
}

function setupDropzone() {
  const dropzone = document.getElementById("dropzoneArea");
  const input = document.getElementById("inputFile");

  if (!dropzone || !input) return;

  dropzone.addEventListener("click", () => input.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  });

  input.addEventListener("change", () => {
    if (input.files && input.files.length > 0) {
      addFiles(Array.from(input.files));
    }
  });
}

function addFiles(newFiles) {
  const combined = [...selectedFilesArr, ...newFiles];
  const maxCount = CONFIG.MAX_FILES_COUNT || 3;

  if (combined.length > maxCount) {
    alert(`Maksimal hanya boleh mengunggah ${maxCount} file sekaligus.`);
    return;
  }

  let totalSize = 0;
  const blockedExts = CONFIG.BLOCKED_EXTENSIONS || [];
  const maxFileMb = CONFIG.MAX_FILE_SIZE_MB || 25;
  const maxTotalMb = CONFIG.MAX_TOTAL_SIZE_MB || 50;

  for (let f of combined) {
    const ext = f.name.split(".").pop().toLowerCase();
    if (blockedExts.includes(ext)) {
      alert(
        `File "${f.name}" berformat .${ext} diblokir demi alasan keamanan.`,
      );
      return;
    }

    if (f.size > maxFileMb * 1024 * 1024) {
      alert(`File "${f.name}" melebihi batas ukuran ${maxFileMb} MB.`);
      return;
    }

    totalSize += f.size;
  }

  if (totalSize > maxTotalMb * 1024 * 1024) {
    const totalMbStr = (totalSize / (1024 * 1024)).toFixed(2);
    alert(
      `Total ukuran file (${totalMbStr} MB) melebihi batas maksimum ${maxTotalMb} MB.`,
    );
    return;
  }

  selectedFilesArr = combined;
  renderFilePreview();
}

function removeFile(index) {
  selectedFilesArr.splice(index, 1);
  renderFilePreview();
}

function getFileIconClass(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return "fa-file-image";
  if (["pdf"].includes(ext)) return "fa-file-pdf";
  if (["doc", "docx"].includes(ext)) return "fa-file-word";
  if (["xls", "xlsx"].includes(ext)) return "fa-file-excel";
  if (["ppt", "pptx"].includes(ext)) return "fa-file-powerpoint";
  if (["mp4", "avi", "mkv", "mov"].includes(ext)) return "fa-file-video";
  if (["mp3", "wav", "m4a"].includes(ext)) return "fa-file-audio";
  if (["zip", "rar"].includes(ext)) return "fa-file-zipper";
  return "fa-file-lines";
}

function renderFilePreview() {
  const previewContainer = document.getElementById("fileListPreview");
  if (!previewContainer) return;

  previewContainer.innerHTML = "";
  if (selectedFilesArr.length === 0) return;

  selectedFilesArr.forEach((file, idx) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const iconClass = getFileIconClass(file.name);

    const chip = document.createElement("div");
    chip.style.display = "flex";
    chip.style.alignItems = "center";
    chip.style.justifyContent = "space-between";
    chip.style.padding = "0.6rem 0.85rem";
    chip.style.background = "var(--neutral-100)";
    chip.style.borderRadius = "var(--radius-sm)";
    chip.style.border = "1px solid var(--neutral-300)";
    chip.style.marginTop = "0.5rem";

    chip.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.6rem; overflow:hidden;">
        <i class="fa-solid ${iconClass}" style="color:var(--primary-600); font-size:1.2rem;"></i>
        <div style="overflow:hidden;">
          <div style="font-size:0.88rem; font-weight:600; color:var(--neutral-800); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</div>
          <div style="font-size:0.75rem; color:var(--neutral-500);">${sizeMb} MB</div>
        </div>
      </div>
      <button type="button" style="background:none; border:none; color:var(--danger-500); cursor:pointer; font-size:1rem; padding:0.25rem;" onclick="removeFile(${idx})">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    previewContainer.appendChild(chip);
  });
}

async function handleUploadTask(e) {
  e.preventDefault();
  const taskId = document.getElementById("currentTaskId").value;
  const folderId = document.getElementById("currentFolderId").value;
  const keterangan = document.getElementById("inputKeterangan").value;
  const statusAlert = document.getElementById("uploadStatusAlert");
  const btnSubmit = document.getElementById("btnSubmitTask");
  const progressContainer = document.getElementById("uploadProgressContainer");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  if (selectedFilesArr.length === 0) {
    statusAlert.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Silakan pilih setidaknya 1 file untuk diunggah.</div>`;
    return;
  }

  btnSubmit.disabled = true;
  progressContainer.style.display = "block";
  statusAlert.innerHTML = "";

  const uploadedFilesResult = [];

  for (let i = 0; i < selectedFilesArr.length; i++) {
    const file = selectedFilesArr[i];
    const pct = Math.round((i / selectedFilesArr.length) * 100);
    progressBar.style.width = `${pct}%`;
    progressText.innerText = `Mengunggah file ${i + 1} dari ${selectedFilesArr.length} (${pct}%)...`;

    try {
      const base64Content = await readFileAsBase64(file);
      const res = await apiRequest({
        action: "uploadSingleFile",
        folderId: folderId,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        base64Content: base64Content,
      });

      if (res.success) {
        uploadedFilesResult.push(res);
      } else {
        statusAlert.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> Gagal mengunggah ${file.name}: ${res.message}</div>`;
        btnSubmit.disabled = false;
        return;
      }
    } catch (err) {
      statusAlert.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> Kesalahan koneksi saat unggah ${file.name}.</div>`;
      btnSubmit.disabled = false;
      return;
    }
  }

  progressBar.style.width = `100%`;
  progressText.innerText = `Mencatat pengumpulan ke spreadsheet...`;

  try {
    const finalRes = await apiRequest({
      action: "submitTask",
      taskId: taskId,
      nis: currentStudent.nis,
      kelas: currentStudent.kelas,
      keterangan: keterangan,
      uploadedFiles: uploadedFilesResult,
    });

    if (finalRes.success) {
      statusAlert.innerHTML = `
        <div class="alert alert-success">
          <h4><i class="fa-solid fa-circle-check"></i> ${finalRes.message}</h4>
          <p><strong>Nomor Pengumpulan:</strong> ${finalRes.submissionId}</p>
          <p><strong>Waktu:</strong> ${finalRes.timestamp}</p>
        </div>
      `;
      document.getElementById("uploadForm").reset();
      selectedFilesArr = [];
      renderFilePreview();

      setTimeout(() => {
        showTaskList();
        loadStudentTasks();
      }, 2000);
    } else {
      statusAlert.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> ${finalRes.message}</div>`;
    }
  } catch (err) {
    statusAlert.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-xmark"></i> Gagal mencatat data pengumpulan.</div>`;
  } finally {
    btnSubmit.disabled = false;
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
