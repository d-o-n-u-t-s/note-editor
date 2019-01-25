import {
  Divider,
  Drawer,
  IconButton,
  List,
  ListSubheader,
  withStyles,
  WithStyles
} from "@material-ui/core";
import { Add, ArrowDownward, ArrowUpward, Delete } from "@material-ui/icons";
import { observer } from "mobx-react";
import * as React from "react";
import LayerItem from "../components/LayerItem";
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

  /**
   * レイヤーを結合する
   */
  handleMergeLayer = () => {
    this.injected.editor.currentChart!.mergeLayer();
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
              <LayerItem
                layer={layer}
                selected={index === chart.currentLayerIndex}
                onSelect={() => this.handleSelect(index)}
                onToggleVisible={() => this.handleToggleVisible(index)}
                onRename={(value: string) => chart.renameLayer(value)}
                onToggleLock={() => chart.toggleLayerLock(index)}
              />
              <Divider />
            </div>
          ))}
        </List>

        <div>
          <IconButton onClick={() => chart.addLayer()}>
            <Add fontSize="small" />
          </IconButton>
          <IconButton
            disabled={chart.layers.length <= 1}
            onClick={() => chart.removeLayer()}
          >
            <Delete fontSize="small" />
          </IconButton>

          {/* レイヤーアップボタン */}
          <IconButton>
            <ArrowUpward fontSize="small" />
          </IconButton>

          {/* レイヤーダウンボタン */}
          <IconButton>
            <ArrowDownward fontSize="small" />
          </IconButton>

          {/* マージボタン */}
          <IconButton
            disabled={chart.currentLayerIndex == chart.layers.length - 1}
            color="primary"
            onClick={this.handleMergeLayer}
          >
            <ArrowDownward fontSize="small" />
          </IconButton>
        </div>
      </Drawer>
    );
  }
}

export default withStyles(styles)(Layer);
