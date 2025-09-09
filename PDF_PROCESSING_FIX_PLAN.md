# PDF Processing Fix Plan - Railway Deployment Issue

## Problem Summary

**Issue**: PDF upload functionality is completely disabled due to `mupdf` npm package causing Railway deployment failures with native dependencies.

**Current State**: All PDF processing code is commented out with "TODO: Re-enable when mupdf is available" comments, resulting in hard-coded error "PDF processing temporarily unavailable" that blocks all PDF uploads.

**Impact**: Critical invoice upload feature is broken - users cannot upload PDF invoices, only images work.

## Root Cause Analysis

### Why mupdf Fails on Railway

1. **Native Dependencies**: The `mupdf` package (v1.26.4) requires native compilation during build
2. **Railway Environment**: Railway uses Nixpacks builder which may not have required build tools
3. **WebAssembly vs Native**: The package likely requires specific system libraries for PDF processing

### Currently Affected Files

| File | Issue | Lines |
|------|-------|-------|
| `/app/api/invoices/process/route.ts` | PDF conversion commented out | 14, 58-77 |
| `/app/api/invoices/[id]/field-positions/route.ts` | Field extraction disabled | Multiple TODO comments |
| `/app/api/invoices/[id]/preview/route.ts` | PDF preview disabled | Import commented out |
| `/lib/pdf-utils.ts` | Working functions exist but unused | All functions |
| `/lib/pdf-field-extractor.ts` | Field extraction functions exist but unused | All functions |

## Research Findings - Railway-Compatible Alternatives

### Option 1: pdf-to-img (RECOMMENDED)
- **Package**: `pdf-to-img` v4.5.0 (published 3 months ago)
- **Advantages**: No system dependencies, simple API, proven cloud deployment success
- **API**: Similar to existing `convertPdfToPng` function signature
- **Deployment**: Works in serverless/cloud environments without GraphicsMagick/Ghostscript

### Option 2: pdfjs-dist + canvas
- **Packages**: `pdfjs-dist` v5.4.149 + `canvas` 
- **Advantages**: Mozilla's official PDF.js, no system dependencies beyond Node.js
- **Requirements**: Must use legacy build `pdfjs-dist/legacy/build/pdf.js`
- **Limitations**: May not render all text properly in simulated canvas environment

### Option 3: sharp-pdf  
- **Package**: `sharp-pdf` - Purpose-built Sharp + PDF.js combination
- **Advantages**: Leverages Sharp's proven Railway compatibility
- **Status**: Based on Sharp (works on Railway) + PDF.js + jsPDF

### Option 4: Official MuPDF.js
- **Package**: Official MuPDF.js v1.26.4 with WebAssembly
- **Advantages**: Same functionality as mupdf but WebAssembly-based
- **Concerns**: ESM-only module, may still have deployment issues

## Implementation Plan

### Phase 1: Replace mupdf with Railway-compatible library
1. **Remove mupdf dependency**: `npm uninstall mupdf`
2. **Install pdf-to-img**: `npm install pdf-to-img @types/pdf-to-img`
3. **Update lib/pdf-utils.ts**: Replace mupdf API calls with pdf-to-img equivalents
4. **Maintain same function signatures**: Keep `convertPdfToPng()` and `convertPdfToMultiplePngs()` interfaces

### Phase 2: Restore PDF processing functionality  
5. **Uncomment imports**: Re-enable `import { convertPdfToPng } from '@/lib/pdf-utils'`
6. **Restore process route**: Uncomment PDF conversion logic in `/app/api/invoices/process/route.ts:72-77`
7. **Re-enable field extraction**: Uncomment mupdf usage in `/app/api/invoices/[id]/field-positions/route.ts`
8. **Restore preview**: Uncomment PDF preview logic in `/app/api/invoices/[id]/preview/route.ts`

### Phase 3: Testing & deployment verification
9. **Local testing**: Test PDF upload with various formats (1-page, multi-page, different sizes)
10. **Build verification**: Run `npm run build` to ensure no build errors
11. **Railway deployment**: Deploy to Railway and verify PDF processing works in production
12. **End-to-end test**: Upload PDF → conversion → AI extraction → database storage

### Fallback Implementation
If pdf-to-img doesn't work:
- Implement **pdfjs-dist + canvas** solution
- Use legacy build approach: `require("pdfjs-dist/legacy/build/pdf.js")`
- Handle canvas rendering limitations

## Technical Implementation Details

### pdf-to-img API Migration
```javascript
// OLD (mupdf):
const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
const page = doc.loadPage(0);
const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB);
const pngBuffer = pixmap.asPNG();

// NEW (pdf-to-img):
import pdf2img from 'pdf-to-img';
const conversion = await pdf2img.convert(pdfBuffer, { page_numbers: [1] });
const base64 = conversion.toString('base64');
```

### Function Signature Compatibility
Maintain existing signatures for seamless integration:
- `convertPdfToPng(pdfBuffer: Buffer): Promise<{base64: string, mediaType: 'image/png', pageCount: number}>`
- `convertPdfToMultiplePngs(pdfBuffer: Buffer): Promise<{pages: Array<{...}>, pageCount: number}>`

## Expected Outcomes

### Immediate Benefits
- ✅ PDF upload functionality restored
- ✅ Railway deployment stability  
- ✅ No breaking changes to existing API
- ✅ Same performance characteristics

### Quality Assurance
- ✅ Maintain 3x zoom for OCR quality (same as Python PyMuPDF version)
- ✅ Support multi-page PDFs (up to 20 pages limit)
- ✅ Proper error handling and resource cleanup
- ✅ File validation (PDF header check, size limits)

## Critical Success Factors

1. **Zero API Changes**: New library must match existing function signatures exactly
2. **Railway Build Success**: Must build cleanly in Railway's Nixpacks environment  
3. **Image Quality**: Must maintain 3x zoom equivalent for reliable AI extraction
4. **Performance**: Conversion time should be comparable to mupdf (2-10 seconds)
5. **Resource Management**: Proper cleanup to prevent memory leaks

## Risk Assessment

**Low Risk**: pdf-to-img is specifically designed for cloud deployment and has proven success
**Medium Risk**: May need to adjust conversion parameters for optimal AI extraction quality
**High Risk**: If all alternatives fail, may need to implement client-side PDF-to-image conversion

## Next Steps

1. **Start with pdf-to-img implementation** (most likely to succeed)
2. **Test locally first** before Railway deployment
3. **Keep mupdf functions as reference** for API compatibility
4. **Document any performance differences** for future optimization

---

**Status**: Ready for implementation  
**Priority**: Critical (blocking core functionality)  
**Estimated Time**: 2-3 hours (implementation + testing)