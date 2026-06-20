import { CommentsInfo, SubCommentsInfo } from 'maa-copilot-client'

export type CommentInfo = MainCommentInfo | SubCommentInfo
export type MainCommentInfo = CommentsInfo
export type SubCommentInfo = SubCommentsInfo

export const enum CommentRating {
  None = 'None',
  Like = 'Like',
  Dislike = 'Dislike',
}

export const MAX_COMMENT_LENGTH = 150
export const AUTHOR_MAX_COMMENT_LENGTH = 500

export function isMainComment(comment: CommentInfo): comment is MainCommentInfo {
  return 'subCommentsInfos' in comment
}

/**
 * Traverses a list of comment info until a comment is found by returning true in the callback.
 * @returns The first comment that matches the callback, or undefined if the callback never returns true
 */
export function traverseComments(
  comments: CommentInfo[],
  callback: (comment: CommentInfo) => void | boolean,
): CommentInfo | undefined {
  return comments.find((comment) => {
    if (callback(comment)) {
      return true
    }

    if ('subCommentsInfos' in comment) {
      return traverseComments(comment.subCommentsInfos, callback)
    }

    return false
  })
}
