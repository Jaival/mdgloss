use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};
use tauri_plugin_fs::FsExt;

const IMAGE_EXTENSIONS: &[&str] = &[
    "apng", "avif", "bmp", "gif", "ico", "jpeg", "jpg", "png", "svg", "webp",
];

fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| IMAGE_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
}

/// Lets the asset protocol load the images a document links to. Opening a single file
/// only grants that file, so its relative images would not load otherwise. The document
/// must already be readable (picked in a dialog, or inside a picked folder), and only
/// image files are granted.
#[tauri::command]
fn allow_document_images(
    app: AppHandle,
    document: PathBuf,
    images: Vec<PathBuf>,
) -> Result<(), String> {
    if !app.fs_scope().is_allowed(&document) {
        return Err(format!("{} was not opened by the user", document.display()));
    }
    let scope = app.asset_protocol_scope();
    for image in images.iter().filter(|path| is_image(path)) {
        scope.allow_file(image).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // Paths the user picks in a dialog are added to the fs scope for this session.
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![allow_document_images])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_image_extensions_in_any_case() {
        assert!(is_image(Path::new("/notes/img/a.png")));
        assert!(is_image(Path::new("C:\\notes\\Diagram.SVG")));
    }

    #[test]
    fn rejects_other_files() {
        assert!(!is_image(Path::new("/home/me/.ssh/id_rsa")));
        assert!(!is_image(Path::new("/notes/week1.md")));
        assert!(!is_image(Path::new("/notes/png")));
    }
}
