/**
 * BarcodeLabel — renders a scannable CODE-128 barcode SVG inline.
 * Uses JsBarcode to draw into an <svg> element.
 * Fully scannable by ZXing (web camera) and expo-camera (mobile).
 */
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeLabelProps {
  value: string;           // barcode number, e.g. "8901"
  productName?: string;    // shown below the barcode
  width?: number;          // bar width multiplier (default 2)
  height?: number;         // bar height in px (default 60)
  fontSize?: number;       // text size (default 13)
  className?: string;
}

export function BarcodeLabel({
  value,
  productName,
  width = 2,
  height = 60,
  fontSize = 13,
  className = "",
}: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width,
        height,
        displayValue: true,
        text: value,
        fontSize,
        fontOptions: "bold",
        textMargin: 4,
        margin: 8,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // invalid barcode value — render nothing
    }
  }, [value, width, height, fontSize]);

  return (
    <div className={`barcode-label-wrap ${className}`}>
      <svg ref={svgRef} />
      {productName && (
        <p className="barcode-label-name">{productName}</p>
      )}
    </div>
  );
}
