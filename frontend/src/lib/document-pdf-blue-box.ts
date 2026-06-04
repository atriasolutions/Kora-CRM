import type { jsPDF } from 'jspdf'

const BLUE: [number, number, number] = [37, 99, 235]

/** Recuadro azul del encabezado (R.U.T., tipo de documento, Nº), texto centrado en azul. */
export function drawDocumentPdfBlueBox(
  doc: jsPDF,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  rut: string,
  title: string,
  documentNo: string,
) {
  const centerX = boxX + boxW / 2
  const padX = boxW - 6

  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.75)
  doc.rect(boxX, boxY, boxW, boxH)

  doc.setTextColor(...BLUE)
  doc.setFont('helvetica', 'bold')

  const rutLine = `R.U.T.: ${rut}`
  doc.setFontSize(9)
  let rutSize = 9
  while (doc.getTextWidth(rutLine) > padX && rutSize > 7) {
    rutSize -= 0.5
    doc.setFontSize(rutSize)
  }
  doc.text(rutLine, centerX, boxY + 8, { align: 'center' })

  doc.setFontSize(12)
  let titleSize = 12
  while (doc.getTextWidth(title) > padX && titleSize > 9) {
    titleSize -= 0.5
    doc.setFontSize(titleSize)
  }
  doc.text(title, centerX, boxY + 15.5, { align: 'center' })

  const numberLine = `Nº ${documentNo}`
  doc.setFontSize(16)
  let numberSize = 16
  while (doc.getTextWidth(numberLine) > padX && numberSize > 11) {
    numberSize -= 0.5
    doc.setFontSize(numberSize)
  }
  doc.text(numberLine, centerX, boxY + 23, { align: 'center' })
}
