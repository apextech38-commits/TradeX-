export default function BotBuilder() {
  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)", overflow: "hidden" }}>
      <iframe
        src="https://dbot.deriv.com"
        style={{ width: "100%", height: "calc(100vh + 80px)", border: "none", marginTop: "-120px" }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
