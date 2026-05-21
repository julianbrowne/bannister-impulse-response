# Bannister Impulse Response

Interactive visualisation of the Bannister (1991) two-component impulse-response model applied to a 10k training plan.

## Running locally

ES modules require the files to be served over HTTP, not opened directly from disk.

```bash
./serve.sh
```

Then open [http://localhost:8080](http://localhost:8080) in a browser.

## Running the tests

```bash
node test.js
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page markup |
| `style.css` | Styles |
| `bir.js` | Chart and scenario definitions |
| `model.js` | Bannister model — parameters, `simulate()`, scenario loads |
| `test.js` | Model correctness tests |
| `serve.sh` | Start local HTTP server (`python3 -m http.server 8080`) |
