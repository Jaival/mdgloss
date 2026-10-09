use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};
use tauri_plugin_fs::FsExt;

const IMAGE_EXTENSIONS: &[&str] = &[
    "apng", "avif", "bmp", "gif", "ico", "jpeg", "jpg", "png", "svg", "webp",
];

/// Stops the vault search from crawling a whole drive when a file sits near the root.
const MAX_VAULT_ENTRIES: usize = 100_000;

fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| IMAGE_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()))
}

/// The nearest folder above the document with an `.obsidian` folder, else the document's own folder.
fn vault_root(doc_dir: &Path) -> &Path {
    doc_dir
        .ancestors()
        .find(|dir| dir.join(".obsidian").is_dir())
        .unwrap_or(doc_dir)
}

/// Image files under root by lower-case file name, skipping hidden folders and node_modules.
fn index_images(root: &Path) -> HashMap<String, Vec<PathBuf>> {
    let mut index: HashMap<String, Vec<PathBuf>> = HashMap::new();
    let mut pending = vec![root.to_path_buf()];
    let mut seen = 0;
    while let Some(dir) = pending.pop() {
        let Ok(entries) = fs::read_dir(&dir) else {
            continue;
        };
        for entry in entries.flatten() {
            seen += 1;
            if seen > MAX_VAULT_ENTRIES {
                return index;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            // file_type() doesn't follow symlinks, so a link back up can't make this loop.
            let Ok(kind) = entry.file_type() else {
                continue;
            };
            if kind.is_dir() {
                if !name.starts_with('.') && name != "node_modules" {
                    pending.push(entry.path());
                }
            } else if kind.is_file() && is_image(Path::new(&name)) {
                index
                    .entry(name.to_lowercase())
                    .or_default()
                    .push(entry.path());
            }
        }
    }
    index
}

/// Finds an Obsidian embed target the way Obsidian does: a path is relative to the
/// vault (or the document), a bare name is looked for next to the document first and
/// then anywhere in the vault, preferring the shallowest match.
fn resolve_embed(
    name: &str,
    doc_dir: &Path,
    root: &Path,
    index: &mut Option<HashMap<String, Vec<PathBuf>>>,
) -> Option<PathBuf> {
    let name = name.trim_start_matches('/');
    let candidates = [root.join(name), doc_dir.join(name)];
    if let Some(found) = candidates.into_iter().find(|path| path.is_file()) {
        return Some(found);
    }
    if name.contains('/') {
        return None;
    }
    index
        .get_or_insert_with(|| index_images(root))
        .get(&name.to_lowercase())?
        .iter()
        .min_by_key(|path| (path.components().count(), path.as_os_str().to_owned()))
        .cloned()
}

/// Lets the asset protocol load the images a document links to, and finds the files
/// behind its Obsidian embeds (![[name.png]]), returned in the order given. Opening a
/// single file only grants that file, so its images would not load otherwise. The
/// document must already be readable (picked in a dialog, or inside a picked folder),
/// and only image files are granted.
#[tauri::command]
fn allow_document_images(
    app: AppHandle,
    document: PathBuf,
    images: Vec<PathBuf>,
    embeds: Vec<String>,
) -> Result<Vec<Option<PathBuf>>, String> {
    if !app.fs_scope().is_allowed(&document) {
        return Err(format!("{} was not opened by the user", document.display()));
    }
    let doc_dir = document.parent().ok_or("the document has no folder")?;
    let root = vault_root(doc_dir);
    let mut index = None;
    let resolved: Vec<Option<PathBuf>> = embeds
        .iter()
        .map(|name| {
            if is_image(Path::new(name)) {
                resolve_embed(name, doc_dir, root, &mut index)
            } else {
                None
            }
        })
        .collect();

    let scope = app.asset_protocol_scope();
    for image in images.iter().chain(resolved.iter().flatten()) {
        if is_image(image) {
            scope.allow_file(image).map_err(|e| e.to_string())?;
        }
    }
    Ok(resolved)
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

    /// A vault like the user's: the note is two folders deep, images live at the root.
    fn vault() -> PathBuf {
        let root = std::env::temp_dir().join(format!("mdgloss-vault-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        for dir in [".obsidian", "networking/Protocols", "images/old", ".trash"] {
            fs::create_dir_all(root.join(dir)).unwrap();
        }
        for file in [
            "networking/Protocols/TCP.md",
            "networking/Protocols/local.png",
            "images/Handshake.png",
            "images/old/handshake.png",
            ".trash/hidden.png",
        ] {
            fs::write(root.join(file), "").unwrap();
        }
        root
    }

    #[test]
    fn resolves_embeds_like_obsidian() {
        let root = vault();
        let doc_dir = root.join("networking/Protocols");
        assert_eq!(vault_root(&doc_dir), root.as_path());

        let mut index = None;
        let mut find = |name: &str| resolve_embed(name, &doc_dir, &root, &mut index);
        // Next to the document wins without a search.
        assert_eq!(find("local.png"), Some(doc_dir.join("local.png")));
        // Anywhere in the vault, case-insensitive, shallowest first.
        assert_eq!(
            find("handshake.png"),
            Some(root.join("images").join("Handshake.png"))
        );
        // Vault-relative paths.
        assert_eq!(
            find("images/old/handshake.png"),
            Some(root.join("images/old/handshake.png"))
        );
        // Hidden folders are not searched.
        assert_eq!(find("hidden.png"), None);
        assert_eq!(find("missing.png"), None);

        fs::remove_dir_all(root).unwrap();
    }
}
