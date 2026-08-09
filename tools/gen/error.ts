/**
 * What was thrown, as a message.
 *
 * `catch (e)` binds `unknown`, and every site in this repo used to reach for `(e as Error).message`
 * - an assertion that a throw was an Error, which nothing establishes. JavaScript lets you throw
 * anything, and `undefined.message` on a thrown string is a second failure on top of the first,
 * inside the handler that was supposed to report it.
 *
 * PROBABLY BELONGS IN hhson-lib. It is entirely project-independent, and rules.md says to say so
 * rather than let a generic helper settle in a project. Left here for now because adding to the
 * shared library is not this change's call to make.
 */
export const messageOf = (thrown: unknown): string => {
	if (thrown instanceof Error) {
		return thrown.message;
	}
	if (typeof thrown === 'string') {
		return thrown;
	}
	return String(thrown);
};
