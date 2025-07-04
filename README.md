# GottaFarmEmAll

A data collection tool that scrapes X (Twitter) user information for usernames listed in `src/BOOSTERS.csv` and stores the data in MongoDB for later access by LLMs.

## Purpose

This project fetches user profile information from X for a list of 315+ usernames and stores it in a MongoDB database. The collected data can then be accessed and analyzed by Large Language Models for various purposes.

## Data Source

The usernames are stored in `src/BOOSTERS.csv` with the following format:
- Column 1: Number (0-315)
- Column 2: Username (without @ symbol)

## Setup

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Requirements

- Bun runtime
- MongoDB database
- X (Twitter) API access (for scraping user data)

This project was created using `bun init` in bun v1.2.8. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
