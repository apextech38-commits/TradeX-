export default function ManualTraders() {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)", overflow: "hidden" }}>
      <iframe
        src="https://smarttrader.deriv.com/en/trading"
        style={{ width: "100%", height: "calc(100vh - 120px)", border: "none" }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
