import * as React from "react";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

import AddIcon from "@material-ui/icons/Add";

import AudioSelect from "./AudioSelect";

class NewChartDialog extends React.Component {
  state = {
    open: false,

    audioIndex: null
  };

  handleClickOpen = () => {
    this.setState({ open: true });
  };

  handleClose = () => {
    this.setState({ open: false });
  };

  render() {
    return (
      <div
        style={{
          margin: 4,
          position: "absolute",
          left: "calc(100% - 48px)"
        }}
      >
        <Button
          color="primary"
          variant="fab"
          aria-label="Add"
          mini
          onClick={this.handleClickOpen}
        >
          <AddIcon />
        </Button>

        <Dialog
          open={this.state.open}
          onClose={this.handleClose}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title">新規譜面</DialogTitle>
          <DialogContent>
            <DialogContentText>
              To subscribe to this website, please enter your email address
              here. We will send updates occasionally.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="システム"
              type="email"
              fullWidth
            />
            <AudioSelect
              value={this.state.audioIndex}
              onChange={newValue =>
                this.setState({
                  audioIndex: newValue
                })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleClose} color="primary">
              キャンセル
            </Button>
            <Button onClick={this.handleClose} color="primary">
              作成
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

export default NewChartDialog;
