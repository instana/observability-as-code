import { parseTags, sendAgentRequest } from '../utils';

export async function handleTag(argv: any) {
    const tagsToApplyInput: string[] = [].concat(argv.tags ?? []).filter(Boolean);
    if (tagsToApplyInput.length === 0) {
        throw new Error('Missing required positional argument: at least one key=value pair is required');
    }
    const tagsToApply = parseTags(tagsToApplyInput, true);
    return sendAgentRequest('agent.tag.set', argv, undefined, tagsToApply);
}
