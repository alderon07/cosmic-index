package commands

import "github.com/spf13/cobra"

func newSearchCommand(state *runtime) *cobra.Command {
	cmd := &cobra.Command{
		Use:     "search",
		Aliases: []string{"find", "list"},
		Short:   "Search cosmic objects",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return state.initClient()
		},
	}

	cmd.AddCommand(newSearchExoplanetsCommand(state))
	cmd.AddCommand(newSearchStarsCommand(state))
	cmd.AddCommand(newSearchSmallBodiesCommand(state))

	return cmd
}
