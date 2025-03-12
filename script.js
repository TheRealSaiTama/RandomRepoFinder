const GITHUB_API = "https://api.github.com/search/repositories";

const LANGUAGE_COLORS = {
  javascript: "#f7df1e",
  typescript: "#3178c6",
  python: "#3572A5",
  java: "#b07219",
  ruby: "#CC342D",
  php: "#4F5D95",
  "c++": "#f34b7d",
  csharp: "#178600",
  go: "#00ADD8",
  rust: "#DEA584",
  swift: "#F05138",
  kotlin: "#A97BFF",
  dart: "#00B4AB",
  elixir: "#6e4a7e",
  default: "#8f8f8f",
};

const languageSelect = document.getElementById("language-select");
const fetchButton = document.getElementById("fetch-button");
const refreshButton = document.getElementById("refresh-button");
const loadingState = document.getElementById("loading-state");
const loadingLanguage = document.getElementById("loading-language");
const emptyState = document.getElementById("empty-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");
const repositoryContainer = document.getElementById("repository-container");

const repoName = document.getElementById("repo-name");
const repoLink = document.getElementById("repo-link");
const repoDescription = document.getElementById("repo-description");
const repoStars = document.getElementById("repo-stars");
const repoForks = document.getElementById("repo-forks");
const repoIssues = document.getElementById("repo-issues");
const languageBadge = document.querySelector(".language-badge");

fetchButton.addEventListener("click", fetchRandomRepository);
refreshButton.addEventListener("click", fetchRandomRepository);

function setupInteractiveEffects() {
  repositoryContainer.addEventListener("mousemove", function (e) {
    const box = this.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    const maxRotation = 5;
    const xRotation = (y / (box.height / 2)) * -maxRotation;
    const yRotation = (x / (box.width / 2)) * maxRotation;
    this.style.transition = "transform 0.1s ease-out";
    this.style.transform = `perspective(1000px) rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
    const stats = document.querySelectorAll(".stat");
    stats.forEach((stat) => {
      const statBox = stat.getBoundingClientRect();
      const statCenterX = statBox.left + statBox.width / 2;
      const statCenterY = statBox.top + statBox.height / 2;
      const distX = e.clientX - statCenterX;
      const distY = e.clientY - statCenterY;
      const distance = Math.sqrt(distX * distX + distY * distY);
      const maxDist =
        Math.sqrt(box.width * box.width + box.height * box.height) / 2;
      const intensity = 1 - Math.min(distance / maxDist, 1);
      stat.style.transform = `translateZ(${intensity * 10}px)`;
      stat.style.boxShadow = `
                                0 ${5 + intensity * 10}px ${
        15 + intensity * 10
      }px rgba(0, 0, 0, 0.3),
                                0 ${2 + intensity * 3}px ${
        5 + intensity * 5
      }px rgba(0, 0, 0, 0.2)
                        `;
    });
  });

  repositoryContainer.addEventListener("mouseleave", function () {
    this.style.transition = "transform 0.5s ease-out";
    this.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
    const stats = document.querySelectorAll(".stat");
    stats.forEach((stat) => {
      stat.style.transition =
        "transform 0.5s ease-out, box-shadow 0.5s ease-out";
      stat.style.transform = "translateZ(0)";
      stat.style.boxShadow = `
                                5px 5px 15px rgba(0, 0, 0, 0.25),
                                -2px -2px 8px rgba(255, 255, 255, 0.03)
                        `;
    });
  });

  [fetchButton, refreshButton].forEach((button) => {
    button.addEventListener("mousedown", function (e) {
      const x = e.clientX - this.getBoundingClientRect().left;
      const y = e.clientY - this.getBoundingClientRect().top;
      const ripple = document.createElement("span");
      ripple.style.position = "absolute";
      ripple.style.width = "100px";
      ripple.style.height = "100px";
      ripple.style.borderRadius = "50%";
      ripple.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
      ripple.style.transform = "translate(-50%, -50%) scale(0)";
      ripple.style.animation = "ripple 0.6s linear";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      this.appendChild(ripple);
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  if (!document.querySelector("#rippleStyle")) {
    const style = document.createElement("style");
    style.id = "rippleStyle";
    style.textContent = `
                        @keyframes ripple {
                                to {
                                        transform: translate(-50%, -50%) scale(4);
                                        opacity: 0;
                                }
                        }
                `;
    document.head.appendChild(style);
  }
}

function showState(state) {
  [loadingState, emptyState, errorState, repositoryContainer].forEach(
    (element) => {
      element.classList.add("hidden");
    }
  );
  state.classList.remove("hidden");
  if (state === repositoryContainer) {
    setTimeout(setupInteractiveEffects, 100);
  }
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setLanguageBadge(language) {
  const normalizedLang = language.toLowerCase();
  const color = LANGUAGE_COLORS[normalizedLang] || LANGUAGE_COLORS.default;
  const displayName = language.charAt(0).toUpperCase() + language.slice(1);
  languageBadge.textContent = displayName;
  languageBadge.style.backgroundColor = color;
  languageBadge.style.boxShadow = `0 4px 15px ${color}80, 0 2px 7px ${color}40`;
  languageBadge.style.setProperty("--dot-color", color);
  const repoContainer = document.getElementById("repository-container");
  repoContainer.style.boxShadow = `
                0 15px 35px rgba(0, 0, 0, 0.4),
                0 5px 15px rgba(0, 0, 0, 0.3),
                0 0 30px ${color}10
        `;
}

function createPulseEffect(color) {
  const existingStyle = document.querySelector("#pulseStyle");
  if (existingStyle) {
    existingStyle.remove();
  }
  const style = document.createElement("style");
  style.id = "pulseStyle";
  style.textContent = `
                @keyframes subtle-pulse {
                        0% {
                                box-shadow: 
                                        0 15px 35px rgba(0, 0, 0, 0.4),
                                        0 5px 15px rgba(0, 0, 0, 0.3),
                                        0 0 30px ${color}10;
                        }
                        50% {
                                box-shadow: 
                                        0 15px 35px rgba(0, 0, 0, 0.4),
                                        0 5px 15px rgba(0, 0, 0, 0.3),
                                        0 0 50px ${color}20;
                        }
                        100% {
                                box-shadow: 
                                        0 15px 35px rgba(0, 0, 0, 0.4),
                                        0 5px 15px rgba(0, 0, 0, 0.3),
                                        0 0 30px ${color}10;
                        }
                }
        `;
  document.head.appendChild(style);
  const repoContainer = document.getElementById("repository-container");
  repoContainer.style.animation = "subtle-pulse 3s infinite";
}

async function fetchRandomRepository() {
  const language = languageSelect.value;
  if (!language) {
    showState(errorState);
    errorMessage.textContent = "Please select a programming language first.";
    return;
  }
  loadingLanguage.textContent = language;
  showState(loadingState);
  fetchButton.disabled = true;
  try {
    const query = `language:${language}`;
    await new Promise((resolve) => setTimeout(resolve, 800));
    const countResponse = await fetch(`${GITHUB_API}?q=${query}&per_page=1`);
    const countData = await countResponse.json();
    if (!countResponse.ok) {
      throw new Error(countData.message || "Failed to fetch repository count");
    }
    const totalCount = countData.total_count;
    if (totalCount === 0) {
      throw new Error(`No repositories found for language: ${language}`);
    }
    const maxAvailable = Math.min(1000, totalCount);
    const randomIndex = Math.floor(Math.random() * maxAvailable);
    const page = Math.floor(randomIndex / 30) + 1;
    const positionInPage = randomIndex % 30;
    const repoResponse = await fetch(
      `${GITHUB_API}?q=${query}&page=${page}&per_page=30&sort=stars`
    );
    const repoData = await repoResponse.json();
    if (!repoResponse.ok) {
      throw new Error(repoData.message || "Failed to fetch repositories");
    }
    if (!repoData.items || repoData.items.length === 0) {
      throw new Error("No repositories found in the response");
    }
    const randomRepo = repoData.items[positionInPage] || repoData.items[0];
    repoName.textContent = randomRepo.name;
    repoLink.href = randomRepo.html_url;
    repoDescription.textContent =
      randomRepo.description || "No description available";
    repoStars.textContent = formatNumber(randomRepo.stargazers_count);
    repoForks.textContent = formatNumber(randomRepo.forks_count);
    repoIssues.textContent = formatNumber(randomRepo.open_issues_count);
    const color =
      LANGUAGE_COLORS[language.toLowerCase()] || LANGUAGE_COLORS.default;
    setLanguageBadge(language);
    createPulseEffect(color);
    repositoryContainer.style.opacity = "0";
    repositoryContainer.style.transform =
      "perspective(1000px) translateZ(-50px)";
    showState(repositoryContainer);
    setTimeout(() => {
      repositoryContainer.style.opacity = "1";
      repositoryContainer.style.transform =
        "perspective(1000px) rotateX(0) rotateY(0) translateZ(0)";
      repositoryContainer.style.transition =
        "all 0.7s cubic-bezier(0.19, 1, 0.22, 1)";
    }, 50);
  } catch (error) {
    showState(errorState);
    errorMessage.textContent =
      error.message || "Something went wrong. Please try again.";
    console.error("Error fetching repository:", error);
  } finally {
    fetchButton.disabled = false;
  }
}

languageSelect.addEventListener("change", () => {
  fetchButton.disabled = !languageSelect.value;
});

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.style.setProperty("--dot-color", "#ffffff");
});
