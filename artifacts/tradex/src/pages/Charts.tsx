export default function Charts() {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)", overflow: "hidden" }}>
      <iframe
        src="https://charts.deriv.com"
        style={{ width: "100%", height: "calc(100vh - 120px)", border: "none" }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
