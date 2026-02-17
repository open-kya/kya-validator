use crate::types::{Manifest, ValidationOptions};

pub fn inspect_manifest(manifest: &Manifest, options: &ValidationOptions) -> (bool, Vec<String>) {
    let mut errors = Vec::new();
    if !options.allowed_kya_versions.is_empty()
        && !options
            .allowed_kya_versions
            .iter()
            .any(|version| manifest.kya_version.starts_with(version))
    {
        errors.push(format!("Unsupported kyaVersion: {}", manifest.kya_version));
    }

    (errors.is_empty(), errors)
}
