import {
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListSubheader,
  TextField,
  withStyles,
  WithStyles
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import { observer } from "mobx-react";
import * as React from "react";
import { inject, InjectedComponent } from "../stores/inject";
import styles from "../styles/styles";

interface IProps extends WithStyles<typeof styles> {}

@inject
@observer
class Layer extends InjectedComponent<IProps> {
  handleSelect = (index: number) => {
    this.injected.editor.currentChart!.selectLayer(index);
  };

  handleToggleVisible = (index: number) => {
    this.injected.editor.currentChart!.toggleLayerVisible(index);
  };

  render() {
    const { classes } = this.props;

    const chart = this.injected.editor.currentChart;

    if (!chart) return <div />;

    return (
      <Drawer
        variant="permanent"
        classes={{
          paper: classes.rightDrawer
        }}
        anchor="right"
      >
        <List
          component="nav"
          subheader={<ListSubheader component="div">Layers</ListSubheader>}
        >
          {chart.layers.map((layer, index) => (
            <div key={layer.guid}>
              <ListItem
                button
                style={{ padding: 0 }}
                selected={index === chart.currentLayerIndex}
                onClick={() => this.handleSelect(index)}
              >
                <IconButton onClick={() => this.handleToggleVisible(index)}>
                  {layer.visible ? (
                    <VisibilityIcon fontSize="small" />
                  ) : (
                    <VisibilityOffIcon fontSize="small" />
                  )}
                </IconButton>
                <TextField
                  value={layer.name}
                  margin="normal"
                  onChange={({ target: { value } }) => {
                    chart.renameLayer(value);
                  }}
                />
              </ListItem>
              <Divider />
            </div>
          ))}
        </List>

        <Divider />
        <div>
          <IconButton onClick={() => chart.addLayer()}>
            <AddIcon />
          </IconButton>
          <IconButton
            disabled={chart.layers.length <= 1}
            onClick={() => chart.removeLayer()}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      </Drawer>
    );
  }
}

export default withStyles(styles)(Layer);
