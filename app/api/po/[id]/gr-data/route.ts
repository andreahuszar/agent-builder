import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const poId = resolvedParams.id;

  try {
    const grHeader = await prisma.gr_headers.findFirst({
      where: { po_id: poId },
      include: {
        gr_lines: true
      }
    });
    
    if (!grHeader) {
      return NextResponse.json({ hasGR: false });
    }
    
    // Get PO lines to compare with GR lines
    const poLines = await prisma.po_lines.findMany({
      where: { po_id: poId },
      orderBy: { line_no: 'asc' }
    });
    
    let totalOrdered = 0;
    let totalReceived = 0;
    
    // Calculate totals
    poLines.forEach(poLine => {
      const qtyOrdered = parseFloat(poLine.qty_ordered?.toString() || '0');
      totalOrdered += qtyOrdered;
      
      // Find matching GR line
      const grLine = grHeader.gr_lines.find(gl => gl.po_line_id === poLine.id);
      if (grLine) {
        totalReceived += parseFloat(grLine.qty_received?.toString() || '0');
      }
    });
    
    const isPartial = totalReceived > 0 && totalReceived < totalOrdered;
    
    console.log(`GR data for PO ${poId}: ${totalReceived}/${totalOrdered} received`);
    
    return NextResponse.json({
      hasGR: true,
      isPartial,
      totalOrdered,
      totalReceived,
      completionPercentage: totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0
    });
    
  } catch (error) {
    console.error('Error fetching GR data:', error);
    return NextResponse.json({ hasGR: false });
  }
}