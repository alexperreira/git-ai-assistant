import simpleGit from 'simple-git';
import dotenv from 'dotenv';
import { OpenAI } from 'openai/client.js';

dotenv.config({ path: new URL('.env', import.meta.url).pathname });

const git = simpleGit();

async function getRecentCommits() {
    const log = await git.log(['-n', '10']);
    return log.all.map(commit => `- ${commit.message} (${commit.hash.substring(0, 7)})`).join('\n');
}

async function generateSummary(commitText) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
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
    console.log('Fetching recent commits...');
    const commits = await getRecentCommits();
    console.log(commits);

    console.log('\nGenerating AI summary...');
    const summary = await generateSummary(commits);
    console.log('\n--- AI Summary ---');
    console.log(summary);
})();