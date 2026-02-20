// These functions are just for type compatibility with the database
// The actual hashing is done on the server side
export const crypt = (password: string, salt: string) => password;
export const gen_salt = (algorithm: string) => ''; 