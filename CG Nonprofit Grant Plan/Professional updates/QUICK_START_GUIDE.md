# Professional Portal Components - Quick Start Guide

**For Developers** | **Last Updated:** March 1, 2026

---

## 🚀 Using the New Components

### 1. Court Order Upload Component

**Import:**
```typescript
import { CourtOrderUpload } from "@/components/professional/court-order-upload";
```

**Usage:**
```typescript
const [showUpload, setShowUpload] = useState(false);

const handleComplete = (extractedData) => {
  console.log("Extracted data:", extractedData);
  // Use extractedData to pre-fill case creation form
};

<CourtOrderUpload
  open={showUpload}
  onClose={() => setShowUpload(false)}
  onComplete={handleComplete}
  token={yourJWTToken}
/>
```

**Expected Data Structure:**
```typescript
interface ExtractedCourtOrderData {
  parent_a_name?: string;
  parent_b_name?: string;
  children?: Array<{
    name: string;
    birthdate?: string;
    confidence: "high" | "medium" | "low";
  }>;
  case_number?: string;
  jurisdiction?: string;
  custody_split?: string;
  schedule?: any;
  child_support_amount?: number;
  child_support_frequency?: string;
  restrictions?: string[];
  confidence_scores?: Record<string, number>;
}
```

---

### 2. Compliance Report Generator

**Import:**
```typescript
import { ComplianceReportGenerator } from "@/components/professional/compliance-report-generator";
```

**Usage:**
```typescript
const [showReport, setShowReport] = useState(false);

<ComplianceReportGenerator
  open={showReport}
  onClose={() => setShowReport(false)}
  familyFileId={caseId}
  caseName="Smith v. Johnson"
  token={yourJWTToken}
/>
```

**Report Configuration:**
- Date ranges: 7, 14, 30, 60, 90, 180, 365 days
- Formats: PDF, Word (.docx), Excel (.xlsx)
- Sections: Exchange, Support, Communication, Messages, Raw Data
- Optional SHA-256 verification hash

---

### 3. ARIA Controls Panel

**Import:**
```typescript
import { ARIAControlsPanel } from "@/components/professional/aria-controls-panel";
```

**Usage:**
```typescript
const [showARIA, setShowARIA] = useState(false);

// Only show if professional has permission
{caseData.can_control_aria && (
  <Button onClick={() => setShowARIA(true)}>
    ARIA Controls
  </Button>
)}

<ARIAControlsPanel
  open={showARIA}
  onClose={() => setShowARIA(false)}
  familyFileId={caseId}
  caseName="Smith v. Johnson"
  token={yourJWTToken}
/>
```

**Settings Structure:**
```typescript
interface ARIASettings {
  rewrite_strictness: number; // 1-10
  auto_flag_hostile: boolean;
  structured_only_mode: boolean;
  silent_handoff_mode: boolean;
  enable_mediation_suggestions: boolean;
  intervention_threshold: number; // 0.0-1.0
}
```

---

## 🔌 Backend API Reference

### Court Order OCR

**Upload Endpoint:**
```
POST /api/v1/documents/upload-court-order
Content-Type: multipart/form-data

Body:
- file: PDF file

Response:
{
  "document_id": "uuid",
  "file_name": "FL-341.pdf",
  "uploaded_at": "2026-03-01T12:00:00Z"
}
```

**Extract Endpoint:**
```
POST /api/v1/documents/{document_id}/extract-court-order
Authorization: Bearer {token}

Response:
{
  "parent_a_name": "Sarah Smith",
  "parent_b_name": "John Johnson",
  "children": [
    {
      "name": "Emma Smith",
      "birthdate": "2015-06-15",
      "confidence": "high"
    }
  ],
  "case_number": "FL-2024-12345",
  "jurisdiction": "Los Angeles Superior Court",
  "custody_split": "50/50",
  "child_support_amount": 800,
  "child_support_frequency": "monthly",
  "confidence_scores": {
    "parent_a_name": 0.98,
    "parent_b_name": 0.96,
    "case_number": 1.0
  }
}
```

---

### Compliance Reports

**Generate Report:**
```
POST /api/v1/professional/cases/{familyFileId}/reports/compliance
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "date_range_start": "2026-01-01",
  "date_range_end": "2026-03-01",
  "format": "pdf",
  "include_exchange": true,
  "include_support": true,
  "include_communication": true,
  "include_messages": false,
  "include_raw_data": false,
  "include_sha256": true
}

Response:
{
  "report_url": "https://api.commonground.com/reports/abc123.pdf",
  "file_name": "compliance-report-2026-03-01.pdf",
  "sha256_hash": "a1b2c3d4...",
  "date_range_start": "2026-01-01",
  "date_range_end": "2026-03-01",
  "generated_at": "2026-03-01T12:00:00Z"
}
```

---

### ARIA Settings

**Get Settings:**
```
GET /api/v1/professional/cases/{familyFileId}/aria/settings
Authorization: Bearer {token}

Response:
{
  "rewrite_strictness": 5,
  "auto_flag_hostile": true,
  "structured_only_mode": false,
  "silent_handoff_mode": false,
  "enable_mediation_suggestions": true,
  "intervention_threshold": 0.3
}
```

**Update Settings:**
```
PUT /api/v1/professional/cases/{familyFileId}/aria/settings
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "rewrite_strictness": 7,
  "auto_flag_hostile": true,
  "structured_only_mode": true,
  "silent_handoff_mode": false,
  "enable_mediation_suggestions": true,
  "intervention_threshold": 0.25
}

Response:
{
  "message": "ARIA settings updated successfully",
  "settings": { ... }
}
```

**Get Interventions:**
```
GET /api/v1/professional/cases/{familyFileId}/aria/interventions?limit=5
Authorization: Bearer {token}

Response:
{
  "stats": {
    "total_interventions": 14,
    "trend": "Increasing"
  },
  "recent": [
    {
      "id": "uuid",
      "category": "hostile",
      "original_text": "I'm sick of you always being late!",
      "rewritten_text": "I'd appreciate if we could work on being on time.",
      "toxicity_score": 0.67,
      "created_at": "2026-02-28T10:30:00Z"
    }
  ]
}
```

---

## 🎨 Styling Reference

All components follow the professional legal theme:

**Colors:**
```css
/* Primary Actions */
bg-amber-900 hover:bg-amber-950 text-white

/* Secondary Actions */
variant="outline" border-2 border-amber-900/30 text-amber-900

/* Success States */
bg-emerald-900 hover:bg-emerald-950 text-white

/* Warning/Alert */
bg-amber-50 border-amber-900/30 text-amber-900

/* Error States */
bg-red-50 border-red-900/30 text-red-900
```

**Typography:**
```css
/* Headings */
className="serif text-2xl font-bold text-slate-900"

/* Body Text */
className="sans text-sm text-slate-600"

/* Labels */
className="sans text-xs font-semibold text-slate-900 uppercase tracking-wider"
```

**Components:**
```css
/* Cards */
className="border-2 border-slate-200 rounded-sm shadow-lg"

/* Buttons */
className="h-11 px-6 font-semibold border-2 shadow-lg"

/* Dialogs */
className="max-w-2xl border-2 border-amber-900/20"
```

---

## 🧪 Testing Examples

### Test Court Order Upload

```typescript
// Test file upload validation
it('should reject non-PDF files', () => {
  const file = new File(['content'], 'test.txt', { type: 'text/plain' });
  // Should show error: "Please select a PDF file"
});

// Test confidence scoring
it('should show correct confidence badges', () => {
  const data = {
    parent_a_name: "John Doe",
    confidence_scores: { parent_a_name: 0.98 }
  };
  // Should display green "High Confidence" badge
});
```

### Test Compliance Report

```typescript
// Test section selection
it('should disable generate button when no sections selected', () => {
  // Uncheck all sections
  // Button should be disabled
});

// Test report generation
it('should show loading state during generation', async () => {
  // Click "Generate Report"
  // Should show progress indicator
  // Should display success message on completion
});
```

### Test ARIA Controls

```typescript
// Test strictness slider
it('should update description when slider changes', () => {
  // Move slider to 8
  // Should show "Maximum Filtering" label
  // Should show appropriate description
});

// Test save functionality
it('should only enable save button when changes are made', () => {
  // Load initial settings
  // Save button should be disabled
  // Change a setting
  // Save button should be enabled
});
```

---

## 📱 Mobile Responsiveness

All components are mobile-responsive:

**Breakpoints:**
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up

**Mobile Behavior:**
- Dialogs: Full-screen on mobile (<640px)
- Buttons: Stack vertically on small screens
- Forms: Single column layout on mobile
- Tables: Horizontal scroll on mobile

**Test on:**
- iPhone SE (375px width)
- iPad (768px width)
- Desktop (1024px+ width)

---

## 🔒 Security Notes

**Authentication:**
- All API calls require valid JWT token
- Token should be passed in `Authorization: Bearer {token}` header
- Frontend never stores sensitive data in localStorage

**File Upload:**
- Only PDF files accepted
- Max file size: 10MB
- Files are scanned for malware on backend

**Data Validation:**
- All form inputs are validated
- API responses are type-checked
- User input is sanitized before display

---

## 💡 Common Issues & Solutions

### Issue: Component doesn't open
**Solution:** Check that `open` prop is being updated correctly with useState

### Issue: API returns 401 Unauthorized
**Solution:** Verify JWT token is valid and not expired

### Issue: Report download doesn't work
**Solution:** Check CORS settings allow blob downloads from API domain

### Issue: Mobile layout breaks
**Solution:** Test with actual device, not just browser devtools

### Issue: TypeScript errors
**Solution:** Ensure all required props are passed, check types match interfaces

---

## 📚 Additional Resources

**Documentation:**
- Professional Portal Guide: `Professional_Portal_Guide_STREAMLINED.md`
- Architecture Spec: `PROFESSIONAL_PORTAL_ARCHITECTURE.md`
- Progress Tracker: `REMAINING_WORK.md`
- Completion Summary: `COMPLETION_SUMMARY.md`

**Code Examples:**
- See `/app/professional/cases/[familyFileId]/page.tsx` for integration examples
- See `/app/professional/cases/page.tsx` for court order upload usage

**Design Reference:**
- Colors and typography: See COMPLETION_SUMMARY.md
- Component patterns: See dashboard/page.tsx

---

**Questions?** Check inline code comments or review the completion summary document.

**Last Updated:** March 1, 2026
