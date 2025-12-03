/**
 * update-readme.js (Hashnode GraphQL + Dev.to final stable version)
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

// ----- CONFIG -----
const DEVTO_USERNAME = "dotsharpfx";
const HASHNODE_HOST = "dotsharpfx"; // Subdomain WITHOUT .hashnode.dev
const MAX_POSTS = 5;
// -------------------

const readmePath = path.join(__dirname, "../../README.md");

// ---------- DEV.TO FETCH ----------
async function getDevToPosts(max = MAX_POSTS) {
  const url = `https://dev.to/api/articles?username=${DEVTO_USERNAME}&per_page=${max}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Dev.to API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.slice(0, max).map((p) => ({
      title: p.title,
      link: p.url,
    }));
  } catch (err) {
    console.error("Dev.to fetch failed:", err.message);
    return [];
  }
}

// ---------- HASHNODE (GraphQL API — never 403) ----------
async function getHashnodePosts(max = MAX_POSTS) {
  const query = `
    query GetPosts($host: String!) {
      publication(host: $host) {
        posts(first: ${max}) {
          edges {
            node {
              title
              url
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        query,
        variables: { host: `${HASHNODE_HOST}.hashnode.dev` },
      }),
    });

    if (!res.ok) {
      console.error(`Hashnode GraphQL status: ${res.status}`);
      return [];
    }

    const json = await res.json();

    const posts =
      json?.data?.publication?.posts?.edges?.map((e) => ({
        title: e.node.title,
        link: e.node.url,
      })) || [];

    return posts;
  } catch (err) {
    console.error("Hashnode GraphQL fetch failed:", err.message);
    return [];
  }
}

// ---------- MARKDOWN HELPERS ----------
function buildMarkdownList(posts) {
  if (!posts.length) return "- No recent posts available.\n";
  return posts.map((p) => `- [${p.title}](${p.link})`).join("\n");
}

function replaceSection(content, marker, newContent) {
  const start = `<!-- ${marker}_START -->`;
  const end = `<!-- ${marker}_END -->`;

  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);

  return content.replace(pattern, `${start}\n${newContent}\n${end}`);
}

// ---------- UPDATE README ----------
async function updateReadme() {
  console.log("🔄 Fetching latest posts...");

  const [devtoPosts, hashnodePosts] = await Promise.all([
    getDevToPosts(),
    getHashnodePosts(),
  ]);

  //console.log("✔ Dev.to posts:", devtoPosts.length);
  console.log("✔ Hashnode posts:", hashnodePosts.length);

  const readme = fs.readFileSync(readmePath, "utf8");

  //let updated = replaceSection(readme, "DEVTO", buildMarkdownList(devtoPosts));
  let updated = replaceSection(readme, "HASHNODE", buildMarkdownList(hashnodePosts));

  fs.writeFileSync(readmePath, updated, "utf8");

  console.log("🎉 README updated successfully!");
}

// ---------- RUN ----------
updateReadme().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
