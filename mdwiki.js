const fs = require("fs");
const path = require("path");

function findMarkdown(inputDir) {
  const files = [];
  for (const each of fs.readdirSync(inputDir)) {
    const stat = fs.lstatSync(path.join(inputDir, each));
    if (stat.isDirectory()) {
      files.push(...findMarkdown(path.join(inputDir, each)));
    } else if (stat.isFile() && each.toLowerCase().endsWith(".md")) {
      files.push(path.join(inputDir, each));
    }
  }
  return files;
}

function toCamelCase(name) {
  return name
    .toUpperCase()
    .replace(/[- :!@#$%^&*()]+/g, "_")
    .split("_")
    .map((part) => part[0].toUpperCase() + part.substring(1).toLowerCase())
    .join("-");
}

function converToWikiName(name) {
  name = name.replace(/^[\/]+/, "");
  name = name.replace(/.md$/i, "");
  const parts = name.split("/");
  const parents = parts.slice(0, parts.length - 1);
  const fileName = parts[parts.length - 1];
  return /README/i.test(fileName)
    ? parents.length === 0
      ? "Home"
      : parents.map((each) => toCamelCase(each)).join(":-")
    : parts.map((each) => toCamelCase(each)).join(":-");
}

function customSort(wikiNames) {
  function moveFrontIfExists(haystack, needle) {
    const index = haystack.indexOf(needle);
    if (index < 0) {
      return haystack;
    }
    haystack.splice(index, 1);
    haystack.unshift(needle);
    return haystack;
  }
  moveFrontIfExists(wikiNames, "Getting-Started");
  moveFrontIfExists(wikiNames, "Home");
}

function checkValidDirectory(input) {
  return input && fs.existsSync(input) && fs.lstatSync(input).isDirectory();
}

function main(inputDir, outputDir) {
  if (!checkValidDirectory(inputDir) || !checkValidDirectory(outputDir)) {
    throw new Error(`${process.argv[0]} ${process.argv[1]} repo-dir wiki-dir`);
  }

  const markdownFiles = findMarkdown(inputDir);
  const fromTos = markdownFiles.map((each) => {
    const wikiName = converToWikiName(each.substring(inputDir.length));
    return {
      from: each,
      to: path.join(outputDir, wikiName + ".md"),
    };
  });
  for (const { from, to } of fromTos) {
    fs.copyFileSync(from, to);
    console.debug("-", to);
  }

  const wikiNames = markdownFiles.map((each) =>
    converToWikiName(each.substring(inputDir.length))
  );
  customSort(wikiNames);

  const sidebar = wikiNames
    .map((wikiName) => {
      const parts = wikiName.split(":-");
      const lastName = parts[parts.length - 1].replace(/-/g, " ");
      const padding = Array.from({ length: parts.length - 1 }, () => "  ").join(
        ""
      );
      return `${padding}* [${lastName}](${encodeURIComponent(wikiName)})`;
    })
    .join("\n");
  fs.writeFileSync(path.join(outputDir, "_Sidebar.md"), sidebar, "utf8");
}

if (require.main === module) {
  main(process.argv[2], process.argv[3]);
}
