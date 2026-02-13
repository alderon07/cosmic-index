package commands

import (
	"fmt"

	"github.com/spf13/cobra"
)

var validShells = []string{"bash", "zsh", "fish", "powershell"}

func newCompletionCommand(state *runtime) *cobra.Command {
	cmd := &cobra.Command{
		Use:       "completion <shell>",
		Short:     "Generate shell completion script",
		Long:      "Generate the autocompletion script for bash, zsh, fish, or powershell.",
		ValidArgs: validShells,
		Args: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				return usageError("requires a shell argument: bash, zsh, fish, or powershell")
			}
			if len(args) > 1 {
				return usageError(fmt.Sprintf("accepts 1 arg, received %d", len(args)))
			}
			for _, s := range validShells {
				if args[0] == s {
					return nil
				}
			}
			return usageError(fmt.Sprintf("unsupported shell %q: must be bash, zsh, fish, or powershell", args[0]))
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			root := cmd.Root()
			out := state.stdout

			switch args[0] {
			case "bash":
				return root.GenBashCompletionV2(out, true)
			case "zsh":
				return root.GenZshCompletion(out)
			case "fish":
				return root.GenFishCompletion(out, true)
			case "powershell":
				return root.GenPowerShellCompletionWithDesc(out)
			}
			return nil
		},
	}
	return cmd
}
