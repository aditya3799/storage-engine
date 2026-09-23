const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const edgeProc = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--user-data-dir=D:\\Projects\\storage\\scratch\\edge_data',
    '--remote-debugging-port=9222',
    'file:///D:/Projects/storage/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9222/json', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', async () => {
      try {
        const targets = JSON.parse(body);
        const target = targets.find(t => t.url.includes('index.html')) || targets[0];
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        let id = 1;

        const send = (method, params = {}) => {
          const msgId = id++;
          ws.send(JSON.stringify({ id: msgId, method, params }));
          return msgId;
        };

        ws.onopen = () => {
          send('Console.enable');
          send('Runtime.enable');

          setTimeout(() => {
            console.log('Testing file:// protocol Write & Read...');
            send('Runtime.evaluate', {
              expression: `
                (function() {
                  window.doWrite();
                  const st = window.app ? window.app.getState() : null;
                  window.doRead();
                  const hit = document.getElementById('metric-last-hit').innerText;
                  return 'FILE:// TEST SUCCESS! Memtable: ' + (st ? st.memtable_entries.length : 'null') + ' key(s), Read Hit: ' + hit;
                })()
              `,
              returnByValue: true
            });
          }, 2000);

          setTimeout(() => {
            ws.close();
            edgeProc.kill();
            process.exit(0);
          }, 5000);
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Runtime.consoleAPICalled') {
            console.log('CONSOLE LOG:', msg.params.args.map(a => a.value || a.description).join(' '));
          } else if (msg.method === 'Runtime.exceptionThrown') {
            console.error('JS EXCEPTION:', msg.params.exceptionDetails.text);
          } else if (msg.result) {
            console.log('CDP Test Result:', JSON.stringify(msg.result));
          }
        };

      } catch (err) {
        console.error('Error:', err);
        edgeProc.kill();
      }
    });
  }).on('error', (err) => {
    console.error('CDP connect error:', err);
    edgeProc.kill();
  });
}

run();
