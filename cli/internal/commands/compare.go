package commands

import "github.com/spf13/cobra"

func newCompareCommand(state *runtime) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "compare",
		Short: "Compare cosmic objects by metrics",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return state.initClient()
		},
	}

	cmd.AddCommand(newCompareExoplanetsCommand(state))

	return cmd
}
