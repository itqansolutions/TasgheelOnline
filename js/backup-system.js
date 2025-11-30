// backup-system.js

document.addEventListener('DOMContentLoaded', () => {
  const backupBtn = document.getElementById('create-backup');
  const restoreInput = document.getElementById('restore-backup');

  if (backupBtn) {
    backupBtn.addEventListener('click', createBackup);
  }

  if (restoreInput) {
    restoreInput.addEventListener('change', restoreBackup);
  }
});

function createBackup() {
  alert("Backup is now handled automatically by the server database. Local backup is no longer needed.");
}

function restoreBackup(event) {
  alert("Restore is now handled by the server administrator. Please contact support.");
  event.target.value = ''; // Reset file input
}
