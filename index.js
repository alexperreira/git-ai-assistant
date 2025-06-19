import simpleGit from 'simple-git';
import dotenv from 'dotenv';
import { OpenAI } from 'openai/client.js';
import { Command } from 'commander';

dotenv.config({ path: new URL('.env', import.meta.url).pathname });

const program = new Command();

program
    .option('-l, --last <number>', 'number of recent commits to summarize', '10')
    .option('-m, --model <model>', 'OpenAI model to use', 'gpt-4o');

program.parse(process.argv);

const options = program.opts();

const git = simpleGit();

async function getRecentCommits(limit) {
    try {
        const log = await git.log(['-n', String(limit)]);
        return log.all.map(commit => `- ${commit.message} (${commit.hash.substring(0, 7)})`).join('\n');
    } catch (err) {
        if (err.message.includes('not a git repository')) {
            console.error('Error: Not a Git repository! Please run this inside a project with Git commits or initialize a new repository');
            process.exit(1);
        } else {
            throw err;
        }
    }
}

async function generateSummary(commitText, model) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: 'system', content: 'You are a helpful assistant that summarizes git commit activity and suggests next steps.' },
            { role: 'user', content: `Here are recent git commits:\n\n${commitText}\n\nPlease summarize what was accomplished, and suggest what to focus on next.` }
        ],
        response_format: { type: 'text' },
        temperature: 1,
        max_completion_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    });

    return response.choices[0].message.content.trim();
}

(async () => {
    console.log(`Fetching last ${options.last} commits...`);
    const commits = await getRecentCommits(options.last);
    console.log(commits);

    console.log(`\nGenerating AI summary using model ${options.model}...`);
    const summary = await generateSummary(commits, options.model);
    console.log('\n--- AI Summary ---');
    console.log(summary);
})();