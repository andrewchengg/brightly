-- Deletes all the QuestionGroups that have no questions

DELETE FROM "QuestionGroup"
WHERE id IN (
    SELECT qg.id
    FROM "QuestionGroup" qg
    LEFT JOIN "Question" q ON q."questionGroupId" = qg.id
    GROUP BY qg.id
    HAVING COUNT(q.id) = 0
);

