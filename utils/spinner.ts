import ora from "npm:ora";

export const spinner = ora({
    text: `Running`,
    discardStdin: false,
});
