

// Actually, `npm run dev` is running, so node is likely installed.
// Modern node has global fetch.

async function probe() {
    const url = "https://gateway-api-testnet.circle.com/v1/transfer";

    // Test 1: burnIntents wrapper
    console.log("Testing { burnIntents: [] }...");
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ burnIntents: [] })
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
    } catch (e) { console.error(e); }

    // Test 2: singular 'burnIntent'
    console.log("\nTesting { burnIntent: { ... } }...");
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ burnIntent: {}, signature: "0x" })
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
    } catch (e) { console.error(e); }
}

probe();
