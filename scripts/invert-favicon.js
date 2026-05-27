const sharp = require("sharp");
const path = require("path");

const src  = path.join(__dirname, "../public/logo-mask.png");
const dest = path.join(__dirname, "../public/favicon.png");

sharp(src)
  .negate({ alpha: false })   // invert RGB, preserve alpha channel
  .toFile(dest)
  .then(() => console.log("favicon.png written to public/"))
  .catch((err) => { console.error("Failed:", err); process.exit(1); });
