const ManualTraders = () => {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', position: 'relative' }}>
      <iframe
        src="https://dtrader.deriv.com"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          marginTop: '-60px'
        }}
        allow="clipboard-read; clipboard-write"
        title="DTrader"
      />
    </div>
  );
};

export default ManualTraders;
