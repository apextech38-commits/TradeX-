export default function Dashboard() {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)", overflow: "hidden" }}>
      <iframe
        src="https://dbot.deriv.com"
        style={{ width: "100%", height: "calc(100vh - 60px)", border: "none", marginTop: "-60px" }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
