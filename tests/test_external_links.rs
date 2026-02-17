use kya_validator::types::{
    ContentCheck, ContentCheckType, LinkCheckConfig, TlsPinConfig, ValidationConfig,
};

#[test]
fn test_tls_pin_config_serialization() {
    let pin_config = TlsPinConfig {
        expected_certificate_hash: Some("abc123".to_string()),
        expected_certificate_pem: Some("-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END CERTIFICATE-----".to_string()),
    };

    let serialized = serde_json::to_string(&pin_config).unwrap();
    let deserialized: TlsPinConfig = serde_json::from_str(&serialized).unwrap();

    assert_eq!(
        deserialized.expected_certificate_hash,
        pin_config.expected_certificate_hash
    );
    assert_eq!(
        deserialized.expected_certificate_pem,
        pin_config.expected_certificate_pem
    );
}

#[test]
fn test_content_check_string_contains() {
    let content_check = ContentCheck {
        check_type: ContentCheckType::StringContains,
        expected_value: "hello world".to_string(),
        json_pointer: None,
    };

    let serialized = serde_json::to_string(&content_check).unwrap();
    let deserialized: ContentCheck = serde_json::from_str(&serialized).unwrap();

    assert!(matches!(
        deserialized.check_type,
        ContentCheckType::StringContains
    ));
    assert_eq!(deserialized.expected_value, "hello world");
}

#[test]
fn test_content_check_json_pointer_equals() {
    let content_check = ContentCheck {
        check_type: ContentCheckType::JsonPointerEquals,
        expected_value: "expected_value".to_string(),
        json_pointer: Some("/field/subfield".to_string()),
    };

    let serialized = serde_json::to_string(&content_check).unwrap();
    let deserialized: ContentCheck = serde_json::from_str(&serialized).unwrap();

    assert!(matches!(
        deserialized.check_type,
        ContentCheckType::JsonPointerEquals
    ));
    assert_eq!(
        deserialized.json_pointer,
        Some("/field/subfield".to_string())
    );
}

#[test]
fn test_link_check_config_with_all_options() {
    let config = LinkCheckConfig {
        json_pointer: "/attestation/attestationUrl".to_string(),
        required_contains: None,
        tls_pin: Some(TlsPinConfig {
            expected_certificate_hash: Some("hash123".to_string()),
            expected_certificate_pem: None,
        }),
        allowed_domains: Some(vec![
            "trusted-domain.com".to_string(),
            "another-domain.io".to_string(),
        ]),
        content_check: Some(ContentCheck {
            check_type: ContentCheckType::StringMatchesRegex,
            expected_value: r"^[A-Za-z0-9]+$".to_string(),
            json_pointer: None,
        }),
        verify_digest: None,
        timeout_secs: Some(60),
        max_retries: Some(5),
        cache_ttl_secs: Some(300),
    };

    let serialized = serde_json::to_string(&config).unwrap();
    let deserialized: LinkCheckConfig = serde_json::from_str(&serialized).unwrap();

    assert_eq!(deserialized.json_pointer, "/attestation/attestationUrl");
    assert_eq!(deserialized.timeout_secs, Some(60));
    assert_eq!(deserialized.max_retries, Some(5));
    assert_eq!(deserialized.cache_ttl_secs, Some(300));
    assert!(deserialized.allowed_domains.is_some());
    assert!(deserialized.tls_pin.is_some());
    assert!(deserialized.content_check.is_some());
}

#[test]
fn test_validation_config_with_link_checks() {
    let config = ValidationConfig {
        check_external_links: true,
        link_checks: vec![LinkCheckConfig {
            json_pointer: "/schemaUrl".to_string(),
            required_contains: Some("kya-manifest".to_string()),
            tls_pin: None,
            allowed_domains: Some(vec!["kya-standard.org".to_string()]),
            content_check: None,
            verify_digest: None,
            timeout_secs: None,
            max_retries: None,
            cache_ttl_secs: None,
        }],
        ..Default::default()
    };

    let serialized = serde_json::to_string(&config).unwrap();
    let deserialized: ValidationConfig = serde_json::from_str(&serialized).unwrap();

    assert!(deserialized.check_external_links);
    assert_eq!(deserialized.link_checks.len(), 1);
    assert_eq!(deserialized.link_checks[0].json_pointer, "/schemaUrl");
}
