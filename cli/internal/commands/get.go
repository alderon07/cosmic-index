package commands

import "github.com/spf13/cobra"

func newGetCommand(state *runtime) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "get",
		Aliases: []string{"show", "info"},
		Short:   "Get object details by id",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return state.initClient()
		},
	}

	cmd.AddCommand(newGetExoplanetCommand(state))
	cmd.AddCommand(newGetStarCommand(state))
	cmd.AddCommand(newGetSmallBodyCommand(state))

	return cmd
}
