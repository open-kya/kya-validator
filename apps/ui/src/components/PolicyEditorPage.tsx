import PolicyEditor from './PolicyEditor';

/**
 * Wrapper component for Policy Editor
 * Maintains compatibility with existing E2E tests
 * The new App.tsx has the preset modal inline, but tests expect this page
 */
export default function PolicyEditorPage() {
  return (
    <div>
      <PolicyEditor />
    </div>
  );
}
