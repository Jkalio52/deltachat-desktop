import React, { Fragment, useState, useEffect, useContext } from 'react'
import SmallDialog, { DeltaButton } from '../helpers/SmallDialog'
import styled, { createGlobalStyle, css } from 'styled-components'
import { useContacts, ContactList2, ContactListItem, PseudoContactListItem } from '../helpers/ContactList'
import { AvatarBubble, AvatarImage, QRAvatar } from '../helpers/Contact'
import ScreenContext from '../../contexts/ScreenContext'
import { Card, Classes, Dialog, Spinner } from '@blueprintjs/core'
import { callDcMethodAsync } from '../../ipc'
import classNames from 'classnames'
import { DeltaDialogBase, DeltaDialogCloseButton } from '../helpers/DeltaDialog'
import debounce from 'debounce'
import C from 'deltachat-node/constants'
import { DeltaButtonPrimary, DeltaButtonDanger } from '../helpers/SmallDialog'
import { remote } from 'electron'
import qr from 'react-qr-svg'

const CreateChatContactListWrapper = styled.div`
  background-color: var(--bp3DialogBgPrimary);
`


export const CreateChatSearchInput = styled.input`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-wrap: normal;
  -webkit-box-flex: 1;
  -ms-flex: 1 1 auto;
  flex: 1 1 auto;
  margin: 0;
  line-height: inherit;
  border: 0px;
  font-size: 18px;
`

export default function CreateChat (props) {
  const { isOpen, onClose } = props
  const tx = window.translate
  const { changeScreen, userFeedback } = useContext(ScreenContext)
  const [show, setShow] = useState('main')

  const [queryStr, setQueryStr] = useState('')
  const queryStrIsEmail = isValidEmail(queryStr)
  const [contacts, updateContacts] = useContacts(C.DC_GCL_ADD_SELF, queryStr)
  
  const closeDialogAndSelectChat = chatId => { 
    onClose()
    changeScreen('ChatView', { chatId })
  }

  const chooseContact = async ({ id }) => {
    const chatId = await callDcMethodAsync('createChatByContactId', id)

    if (!chatId) {
      return userFeedback({ type: 'error', text: tx('create_chat_error_desktop') })
    }
    closeDialogAndSelectChat(chatId)
  }


  const onSearchChange = e => {
    let queryStr = e.target.value
    setQueryStr(queryStr)
    updateContacts(C.DC_GCL_ADD_SELF, queryStr)
  }

  const renderAddGroupIfNeeded = () => {
    if (queryStr !== '') return null
    return (
      <Fragment>
        <PseudoContactListItem
          id='newgroup'
          cutoff='+'
          text={tx('menu_new_group')}
          onClick={() => setShow('createGroup-main')}
        />
        <PseudoContactListItem
          id='newverifiedgroup'
          cutoff='+'
          text={tx('menu_new_verified_group')}
        />
      </Fragment>
    )
  }
  
  const addContactOnClick = async () => {
    if (!queryStrIsEmail) return
    
    const contactId = await callDcMethodAsync('createContact', [queryStr, queryStr])
    const chatId = await callDcMethodAsync('createChatByContactId', contactId)
    closeDialogAndSelectChat(chatId)
  }

  const renderAddContactIfNeeded = () => {
    if (queryStr === '' ||
        (contacts.length === 1 && contacts[0].address.toLowerCase() == queryStr.toLowerCase())) {
      return null
    }
    return (
      <PseudoContactListItem
        id='newcontact'
        cutoff='+'
        text={tx('menu_new_contact')}
        subText={queryStrIsEmail ? queryStr + ' ...' : tx('contacts_type_email_above')}
        onClick={addContactOnClick}
      />
    )
  }


  return (
     <DeltaDialogBase 
       isOpen={isOpen}
       onClose={onClose}
       style={{ width: '400px', height: '76vh', top: '12vh' }}
       fixed
     >
        { show.startsWith('main') && 
          (<>
            <div className='bp3-dialog-header'>
              <CreateChatSearchInput onChange={onSearchChange} value={queryStr} placeholder={tx('contacts_enter_name_or_email')} autoFocus />
              <DeltaDialogCloseButton onClick={onClose} />
            </div>
            <div className={Classes.DIALOG_BODY}>
              <CreateChatContactListWrapper>
                { renderAddGroupIfNeeded()}
                <ContactList2 contacts={contacts} onClick={chooseContact} />
                {renderAddContactIfNeeded()}
              </CreateChatContactListWrapper>
            </div>
            <div className={Classes.DIALOG_FOOTER} />
          </>)
        }
        { show.startsWith('createGroup') && <CreateGroupInner {...{show, setShow, onClose}} />}
     </DeltaDialogBase>
  )
}

export const GroupNameInput = styled.input`
  margin-left: 20px;
  font-size: x-large;
  width: 78%;
  border: 0;
  border-bottom: solid;
  border-color: var(--loginInputFocusColor);
  height: 32px;
`

const CreateGroupSettingsContainer = styled.div`
  margin-top: -8px;
  margin-left: -20px;
  margin-right: -20px;
  padding: 0px 40px 0px 40px;
`
const CreateGroupSeperator = styled.div`
  margin: ${({noMargin}) => noMargin ? '0px' : '20px -20px 0px -20px'};
  padding: 10px 20px;
  background-color: lightgrey;
  color: grey;
`

const CreateGroupMemberContactListWrapper = styled.div`
  margin-left: -20px;
  margin-right: -20px;
`

const CreateGroupMemberSearchInput = styled(CreateChatSearchInput)`
  margin-left: 40px;
  padding: 10px 0px;
  width: calc(100% - 80px);
`

const NoSearchResultsAvatarBubble = styled(AvatarBubble)`
  transform: rotate(45deg); 
  line-height: 46px;
  letter-spacing: 1px;
  &::after {
    content: ':-(';
  }
`

const CrossWrapperSpanMixin = css`
    display: block;
    position: relative;
    width: 16px;
    height: 3px;
    left: 5px;
    background-color: white;
`

const GroupImageUnsetButtonWrapper = styled.div`
  position: relative;
  width: 26px;
  height: 26px;
  left: -11px;
  top: -2px;
  background-color: #e56555;
  border-radius: 50%;
  &:hover, span:hover {
    cursor: pointer;
  }
  span:nth-child(1) {
    ${CrossWrapperSpanMixin}
    transform: rotate(130deg);
    top: 11px;
  }
  span:nth-child(2) {
    ${CrossWrapperSpanMixin}
    transform: rotate(-130deg);
    top: 8px;
  }
`

const CrossWrapper = styled.div`
`

const Cross = (props) => <CrossWrapper><span/><span/></CrossWrapper>
const GroupImageUnsetButton = (props) => {
  return <GroupImageUnsetButtonWrapper {...props} ><span/><span/></GroupImageUnsetButtonWrapper>
}



const GroupImageWrapper = styled.div`
  &:hover {
    cursor: pointer;
  }
`

const GroupImage = (props) => {
  const { groupImage, onSetGroupImage, onUnsetGroupImage } = props
  return (
    <GroupImageWrapper>
      { groupImage && <AvatarImage src={groupImage} onClick={onSetGroupImage} {...props}/> }
      { !groupImage && <AvatarBubble onClick={onSetGroupImage} {...props}>G</AvatarBubble> }
      <GroupImageUnsetButton style={{visibility: groupImage ? 'visible' : 'hidden'}} onClick={onUnsetGroupImage}/>
    </GroupImageWrapper>
  )
}

export function useContactSearch(updateContacts) {
  const [searchString, setSearchString] = useState('')
  
  const updateSearch = searchString => {
    setSearchString(searchString)
    updateContacts(C.DC_GCL_ADD_SELF, searchString)
  }

  const onSearchChange = e => updateSearch(e.target.value)
  
  return [searchString, onSearchChange, updateSearch]
}

export function CreateGroupInner({show, setShow, onClose}) {
  const tx = window.translate
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState([1])
  const [groupImage, setGroupImage] = useState('')
  const [groupId, setGroupId] = useState(-1)
  const [qrCode, setQrCode] = useState('')
  const [searchContacts, updateSearchContacts] = useContacts(C.DC_GCL_ADD_SELF, '')
  const [queryStr, onSearchChange, updateSearch] = useContactSearch(updateSearchContacts)
  const searchContactsToAdd = queryStr !== '' ?  
    searchContacts.filter(({id}) => groupMembers.indexOf(id) === -1).filter((_, i) => i < 5) :
    []

  
  useEffect(() => {
    async function createInitialGroup() {
        const groupId = await callDcMethodAsync('createGroupChat', [false, ''])
        setGroupId(groupId)
    }
    createInitialGroup()
  }, [])

  const onSetGroupImage = () => { 
    remote.dialog.showOpenDialog({
      title: tx('select_group_image_desktop'),
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }],
      properties: ['openFile']
    }, files => {
      if (Array.isArray(files) && files.length > 0) {
        setGroupImage(files[0])
      }
    })
  }

  const updateGroupName = async groupName => {
    callDcMethodAsync('setChatName', [groupId, groupName])
    setGroupName(groupName)
  }

  const onUnsetGroupImage = () => setGroupImage('')


  const removeGroupMember = ({id}) => id !== 1 && setGroupMembers(groupMembers.filter(gId => gId !== id))
  const addGroupMember = ({id}) => setGroupMembers([...groupMembers, id])
  const addRemoveGroupMember = ({id}) => {
    console.log('addRemoveGroupMember', id, groupMembers)
    groupMembers.indexOf(id) !== -1 ? removeGroupMember({id}) : addGroupMember({id})
  }

  const renderAddMemberIfNeeded = () => {
    if (queryStr !== '') return null
    return (
      <>
        <PseudoContactListItem
          id='addmember'
          cutoff='+'
          text={tx('group_add_members')}
          onClick={() => setShow('createGroup-addMember')}
        />
        <PseudoContactListItem
          id='showqrcode'
          cutoff='+'
          text={tx('qrshow_title')}
          onClick={async () => {
            if(groupId === -1) return
            const qrCode = await callDcMethodAsync('getQrCode', groupId)
            setQrCode(qrCode)
            setShow('createGroup-showQrCode')
          }}
        >
          <QRAvatar />
        </PseudoContactListItem>
      </>   
    )   
  }
  if(groupId === -1) return <Spinner />
  return (
    <>
      { show.startsWith('createGroup-addMember') &&
        <>
          <div className='bp3-dialog-header'>
           <button onClick={() => {updateSearch(''); setShow('createGroup-main')}} className='bp3-button bp3-minimal bp3-icon-large bp3-icon-arrow-left' />
           <h4 className='bp3-heading'>{tx('group_add_members')}</h4>
           <DeltaDialogCloseButton onClick={onClose} />
          </div>
          <div className={Classes.DIALOG_BODY}>
           <Card style={{paddingTop: '0px'}}>
             <CreateGroupMemberSearchInput onChange={onSearchChange} value={queryStr} placeholder={tx('search')} autoFocus />
             <CreateGroupMemberContactListWrapper>
               <ContactList2
                 contacts={searchContacts}
                 onClick={()=>{}}
                 showCheckbox
                 isChecked={({id}) => groupMembers.indexOf(id) !== -1}
                 onCheckboxClick={addRemoveGroupMember}
               />
             </CreateGroupMemberContactListWrapper>
           </Card>
          </div>
          <div className={Classes.DIALOG_FOOTER} />
        </>
      }
      { show.startsWith('createGroup-showQrCode') &&
        <>
          <div className='bp3-dialog-header'>
           <button onClick={() => {updateSearch(''); setShow('createGroup-main')}} className='bp3-button bp3-minimal bp3-icon-large bp3-icon-arrow-left' />
           <h4 className='bp3-heading'>{tx('qrshow_title')}</h4>
           <DeltaDialogCloseButton onClick={onClose} />
          </div>
          <div className={Classes.DIALOG_BODY}>
           <Card style={{paddingTop: '0px'}}>
            <qr.QRCode
              bgColor='#FFFFFF'
              fgColor='#000000'
              level='Q'
              value={qrCode}
            />
           </Card>
          </div>
          <div className={Classes.DIALOG_FOOTER} />
        </>
      }
      { show.startsWith('createGroup-main') &&
        <>
          <div className='bp3-dialog-header'>
           <button onClick={() => setShow('main')} className='bp3-button bp3-minimal bp3-icon-large bp3-icon-arrow-left' />
           <h4 className='bp3-heading'>{tx('menu_new_group')}</h4>
           <DeltaDialogCloseButton onClick={onClose} />
          </div>
          <div className={Classes.DIALOG_BODY}>

          <Card>
            <CreateGroupSettingsContainer>
              <GroupImage style={{float: 'left'}} groupImage={groupImage} onSetGroupImage={onSetGroupImage} onUnsetGroupImage={onUnsetGroupImage}/>
              <GroupNameInput placeholder={tx('group_name')} autoFocus value={groupName} onChange={({target}) => updateGroupName(target.value)} />
            </CreateGroupSettingsContainer>
            <CreateGroupSeperator>{tx('n_members', groupMembers.length, groupMembers.length <= 1 ? 'one' : 'other' )}</CreateGroupSeperator>
            <CreateGroupMemberContactListWrapper>
              <CreateGroupMemberSearchInput onChange={onSearchChange} value={queryStr} placeholder={tx('search')} />
              {renderAddMemberIfNeeded()}  
              <ContactList2
                contacts={searchContacts.filter(({id}) => groupMembers.indexOf(id) !== -1)}
                onClick={()=>{}}
                showCheckbox
                isChecked={() => true}
                onCheckboxClick={removeGroupMember}
              />
              {queryStr !== '' && searchContactsToAdd.length !== 0 && (
                <>
                  <CreateGroupSeperator noMargin>{tx('group_add_members')}</CreateGroupSeperator>
                  <ContactList2
                    contacts={searchContactsToAdd}
                    onClick={()=>{}}
                    showCheckbox
                    isChecked={() => false}
                    onCheckboxClick={addGroupMember}
                  />
                </>
              )}
              {queryStr !== '' && searchContacts.length === 0 && (
                <>
                <PseudoContactListItem
                  id='addmember'
                  text={tx('search_no_result_for_x', queryStr)}
                  onClick={() => {}}
                >
                  <NoSearchResultsAvatarBubble />
                </PseudoContactListItem>
                </>
              )}
            </CreateGroupMemberContactListWrapper>
          </Card>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div
              className={Classes.DIALOG_FOOTER_ACTIONS}
            >
              <DeltaButtonPrimary
                noPadding
                onClick={() => onClick(true)}
              >
                {tx('group_create_button')}
              </DeltaButtonPrimary>
            </div>
          </div>
        </>
      }
    </>
  )

}

function isValidEmail(email) {
  // empty string is not allowed
  if (email == '') return false
  let parts = email.split('@')
  // missing @ character or more than one @ character
  if (parts.length !== 2) return false
  let [local, domain] = parts 
  // empty string is not valid for local part
  if(local == '') return false
  // domain is too short
  if(domain.length <= 3) return false
  let dot = domain.indexOf('.')
  // invalid domain without a dot
  if(dot === -1) return false
  // invalid domain if dot is (second) last character
  if(dot >= domain.length - 2) return false
  
  return true  
}

