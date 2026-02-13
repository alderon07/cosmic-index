package commands

import "github.com/spf13/cobra"

func newSearchCloseApproachesAlias(state *runtime) *cobra.Command {
	cmd := newCloseApproachesCommand(state)
	cmd.Hidden = true
	cmd.PreRunE = nil // rely on search's PersistentPreRunE
	return cmd
}

func newSearchFireballsAlias(state *runtime) *cobra.Command {
	cmd := newFireballsCommand(state)
	cmd.Hidden = true
	cmd.PreRunE = nil // rely on search's PersistentPreRunE
	return cmd
}
