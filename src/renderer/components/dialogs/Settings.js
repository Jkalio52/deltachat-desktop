const React = require('react')
const crypto = require('crypto')
const { ipcRenderer, remote } = require('electron')
const styled = require('styled-components').default

const MAGIC_PW = crypto.randomBytes(8).toString('hex')
const {
  Elevation,
  H5,
  Card,
  ButtonGroup,
  Classes,
  Button,
  Dialog,
  Switch,
  Callout
} = require('@blueprintjs/core')

const Login = require('../Login')
const KeyTransfer = require('./KeyTransfer')
const confirmationDialog = require('./confirmationDialog')
const State = require('../../lib/state')

const SettingsDialog = styled.div`
  .bp3-card:not(:last-child){
    margin-bottom: 20px;
  }
`

class Settings extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      keyTransfer: false,
      saved: props.saved,
      advancedSettings: {},
      userDetails: false,
      mailPw: MAGIC_PW
    }
    this.initiateKeyTransfer = this.initiateKeyTransfer.bind(this)
    this.onKeyTransferComplete = this.onKeyTransferComplete.bind(this)
    this.onBackupExport = this.onBackupExport.bind(this)
    this.onBackupImport = this.onBackupImport.bind(this)
    this.handleSettingsChange = this.handleSettingsChange.bind(this)
    this.onLoginSubmit = this.onLoginSubmit.bind(this)
    this.handleEncryptionToggle = this.handleEncryptionToggle.bind(this)
  }

  componentDidUpdate (prevProps) {
    if (this.props.isOpen && !prevProps.isOpen) {
      var advancedSettings = ipcRenderer.sendSync('dispatchSync', 'getAdvancedSettings')
      advancedSettings.e2ee_enabled = !!Number(advancedSettings.e2ee_enabled)
      this.setState({ advancedSettings })
    }
  }

  onKeyTransferComplete () {
    this.setState({ keyTransfer: false })
  }

  onBackupImport () {
    const tx = window.translate
    var opts = {
      title: tx('import_backup_title'),
      properties: ['openFile'],
      filters: [{ name: 'DeltaChat .bak', extensions: ['bak'] }]
    }
    remote.dialog.showOpenDialog(opts, filenames => {
      if (!filenames || !filenames.length) return
      ipcRenderer.send('dispatch', 'backupImport', filenames[0])
    })
  }

  onBackupExport () {
    const tx = window.translate
    var confirmOpts = {
      buttons: [tx('cancel'), tx('export_backup_desktop')]
    }
    confirmationDialog(tx('pref_backup_export_explain'), confirmOpts, response => {
      if (!response) return
      var opts = {
        title: tx('export_backup_desktop'),
        defaultPath: remote.app.getPath('downloads'),
        properties: ['openDirectory']
      }
      remote.dialog.showOpenDialog(opts, filenames => {
        if (!filenames || !filenames.length) return
        ipcRenderer.send('dispatch', 'backupExport', filenames[0])
      })
    })
  }

  initiateKeyTransfer () {
    this.setState({ keyTransfer: true })
  }

  handleSettingsChange (key, value) {
    this.state.saved[key] = value
    this.setState({ saved: this.state.saved })
    State.save({ saved: this.state.saved })
    ipcRenderer.send('updateSettings', this.state.saved)
  }

  handleEncryptionToggle () {
    let val = 1
    if (this.state.advancedSettings.e2ee_enabled) val = 0
    ipcRenderer.sendSync('dispatchSync', 'setConfig', 'e2ee_enabled', val)
    this.setState({ advancedSettings: { e2ee_enabled: val } })
  }

  onLoginSubmit (config) {
    this.props.userFeedback(false)
    if (config.mailPw === MAGIC_PW) delete config.mailPw
    ipcRenderer.send('updateCredentials', config)
  }

  render () {
    const { deltachat, isOpen, onClose } = this.props
    const { userDetails, advancedSettings, saved, keyTransfer } = this.state

    const tx = window.translate
    const title = tx('menu_settings')

    return (
      <div>
        <KeyTransfer isOpen={keyTransfer} onClose={this.onKeyTransferComplete} />
        <Dialog
          isOpen={userDetails !== false}
          title={tx('pref_password_and_account_settings')}
          icon='settings'
          onClose={() => this.setState({ userDetails: false })}>
          <SettingsDialog className={Classes.DIALOG_BODY}>
            <Card elevation={Elevation.ONE}>
              <H5>{tx('pref_password_and_account_settings')}</H5>
              <Login
                {...advancedSettings}
                mailPw={this.state.mailPw}
                onSubmit={this.onLoginSubmit}
                loading={deltachat.configuring}
                addrDisabled>
                <Button type='submit' text={tx('login_title')} />
                <Button type='cancel' text={tx('cancel')} />
              </Login>
            </Card>
          </SettingsDialog>
        </Dialog>
        <Dialog
          isOpen={isOpen && !keyTransfer && !userDetails}
          title={title}
          icon='settings'
          onClose={onClose}>
          <SettingsDialog className={Classes.DIALOG_BODY}>
            <Card elevation={Elevation.ONE}>
              <H5>{deltachat.credentials.addr}</H5>
              <Button onClick={() => this.setState({ userDetails: true })}>
                {tx('pref_password_and_account_settings')}
              </Button>
            </Card>
            <Card elevation={Elevation.ONE}>
              <H5>{tx('autocrypt')}</H5>
              <Callout>{tx('autocrypt_explain')}</Callout>
              <br />
              <Switch
                checked={advancedSettings.e2ee_enabled}
                label={tx('autocrypt_prefer_e2ee')}
                onChange={this.handleEncryptionToggle}
              />
              <Button onClick={this.initiateKeyTransfer}>
                {tx('autocrypt_send_asm_button')}
              </Button>
            </Card>
            <Card elevation={Elevation.ONE}>
              <H5>{tx('pref_backup')}</H5>
              <ButtonGroup>
                <Button onClick={this.onBackupExport}>{tx('pref_backup_export_start_button')}</Button>
                <Button onClick={this.onBackupImport}>{tx('import_backup_title')}</Button>
              </ButtonGroup>
            </Card>
            <Card elevation={Elevation.ONE}>
              <H5>{tx('pref_privacy')}</H5>
              <Switch
                checked={saved && saved.markRead}
                label={tx('pref_read_receipts')}
                onChange={() => this.handleSettingsChange('markRead', !this.state.saved.markRead)}
              />
            </Card>
          </SettingsDialog>
        </Dialog>
      </div>
    )
  }
}

module.exports = Settings