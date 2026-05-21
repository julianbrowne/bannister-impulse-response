# Bannister Impulse Response

Interactive visualisation of the Bannister (1991) two-component impulse-response model applied to a 10k training plan.

## View on GH pages

https://julianbrowne.github.io/bannister-impulse-response/

## Running locally

ES modules require the files to be served over HTTP, not opened directly from disk.

```bash
./serve.sh
```

Then open [http://localhost:8080](http://localhost:8080) in a browser.

## Running the tests

```bash
node test/test.js
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page markup |
| `css/style.css` | Styles |
| `js/bir.js` | Chart and scenario definitions |
| `js/model.js` | Bannister model — parameters, `simulate()`, scenario loads |
| `test/test.js` | Model correctness tests |
| `serve.sh` | Start local HTTP server (`python3 -m http.server 8080`) |
