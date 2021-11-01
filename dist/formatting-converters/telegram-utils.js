"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillMarkdownEntitiesMarkup = void 0;
const generic_1 = require("./generic");
const R = require("ramda");
const rewriteTextAtPosition = (text, position, rewriteText, rewriteLength = rewriteText.length) => text.substr(0, position) +
    rewriteText +
    text.substr(position + rewriteLength);
const insertTextAtPosition = (text, position, insertText) => rewriteTextAtPosition(text, position, insertText, 0);
const escapeChars = (text, charsToEscape) => {
    for (const char of charsToEscape) {
        text = text.split(char).join(`\\${char}`);
    }
    return text;
};
const escapeCommonChars = (text) => escapeChars(text, [
    '_',
    '*',
    '[',
    ']',
    '(',
    ')',
    '~',
    '`',
    '>',
    '#',
    '+',
    '-',
    '=',
    '|',
    '{',
    '}',
    '.',
    '!',
]);
const escapeCodeChars = (text) => escapeChars(text, ['`', '\\']);
const escapeLinkChars = (text) => escapeCommonChars(escapeChars(text, [')', '\\']));
const escapeMarkdownTextByEntity = (text, entity) => {
    // return text;
    if (entity.type === 'symbol') {
        return generic_1.escapeHTML(text);
    }
    else if (entity.type === 'bold') {
        return escapeCommonChars(text);
    }
    else if (entity.type === 'italic') {
        return escapeCommonChars(text);
    }
    else if (entity.type === 'underline') {
        return escapeCommonChars(text);
    }
    else if (entity.type === 'strikethrough') {
        return escapeCommonChars(text);
    }
    else if (entity.type === 'code') {
        return escapeCodeChars(text);
    }
    else if (entity.type === 'pre') {
        return escapeCodeChars(text);
    }
    else if (entity.type === 'text_link') {
        return escapeLinkChars(text);
    }
    else if (entity.type === 'text_mention') {
        return escapeLinkChars(text);
    }
    else {
        return text;
    }
};
const wrapTextWithMarkdownEntity = (text, entity) => {
    let openTag = '';
    let closeTag = '';
    if (entity.type === 'pre') {
        openTag = `\`\`\`${entity.language ? entity.language + '\n' : '\n'}`;
        closeTag = '```';
        return `${openTag}${text}${closeTag}`;
    }
    else {
        if (entity.type === 'bold') {
            openTag = closeTag = '**';
        }
        else if (entity.type === 'italic') {
            openTag = closeTag = '*';
        }
        else if (entity.type === 'underline') {
            openTag = '<u>';
            closeTag = '</u>';
        }
        else if (entity.type === 'strikethrough') {
            openTag = '<s>';
            closeTag = '</s>';
        }
        else if (entity.type === 'code') {
            openTag = closeTag = '```';
        }
        else if (entity.type === 'text_link') {
            openTag = '[';
            closeTag = `](${entity.url})`;
        }
        else if (entity.type === 'text_mention') {
            openTag = '[';
            closeTag = `](https://t.me/${text.split("").slice(1)})`;
        }
        else {
            return text;
        }
        const breakLinePosition = text.indexOf('\n');
        if (breakLinePosition > -1) {
            text = insertTextAtPosition(text, breakLinePosition, closeTag);
            return `${openTag}${text}`;
        }
        else {
            return `${openTag}${text}${closeTag}`;
        }
    }
};
const findIndices = (str, char) => str.split('').reduce((indices, letter, index) => { letter === char && indices.push(index); return indices; }, []);
function addBracketEntities(text) {
    let indices = [];
    for (const char of ["<", ">"]) {
        indices = indices.concat(findIndices(text, char));
    }
    return indices.map(index => ({
        type: 'symbol',
        offset: index,
        length: 1
    }));
}
const fillMarkdownEntitiesMarkup = (text, entities, logger) => {
    const bracketedIndices = addBracketEntities(text);
    entities = entities.concat(bracketedIndices);
    const entitiesChunks = R.groupBy((entity) => entity.offset)(entities);
    const topLevelEntities = R.reverse(Object.values(entitiesChunks).map((entitiesList) => entitiesList[0]));
    for (const entity of topLevelEntities) {
        let offset = 0;
        let modifiedText = text;
        let prevNestedWrappedText;
        // nested entities in length ascending order
        const nestedEntities = R.reverse(R.tail(entitiesChunks[entity.offset]));
        const processEntity = (text, entity) => {
            let accumOffset = 0; // accumulated offset after adding markup tags
            let entityText = text.substr(entity.offset, entity.length + offset);
            // if it's the most nested tag, then it's safe to escape
            if (typeof prevNestedWrappedText === 'undefined') {
                const escapedEntityText = escapeMarkdownTextByEntity(entityText, entity);
                accumOffset += escapedEntityText.length - entityText.length;
                entityText = escapedEntityText;
            }
            else {
                // getting the text difference between the previous entity text
                const diffEntityText = entityText.substr(prevNestedWrappedText.length, entityText.length - prevNestedWrappedText.length);
                // escape diff part
                const escapedDiffEntityText = escapeMarkdownTextByEntity(diffEntityText, entity);
                accumOffset += escapedDiffEntityText.length - diffEntityText.length;
                entityText = rewriteTextAtPosition(entityText, prevNestedWrappedText.length, escapedDiffEntityText, diffEntityText.length);
            }
            let wrappedNestedEntityText = wrapTextWithMarkdownEntity(entityText, entity);
            // fix italic/underline ambiguity
            if (entity.type === 'underline' || entity.type === 'italic') {
                wrappedNestedEntityText = `\r${wrappedNestedEntityText}\r`;
            }
            accumOffset += wrappedNestedEntityText.length - entityText.length;
            text = rewriteTextAtPosition(text, entity.offset, wrappedNestedEntityText, entity.length + offset);
            offset += accumOffset;
            prevNestedWrappedText = wrappedNestedEntityText;
            return text;
        };
        for (const nestedEntity of nestedEntities) {
            modifiedText = processEntity(modifiedText, nestedEntity);
        }
        text = processEntity(modifiedText, entity);
    }
    logger.log({
        level: "info",
        function: "tg filler",
        array: bracketedIndices,
        text
    });
    return text;
};
exports.fillMarkdownEntitiesMarkup = fillMarkdownEntitiesMarkup;
