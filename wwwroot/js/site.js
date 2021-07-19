/** Initialize MDC Web components section */
mdc.autoInit();

document.getElementById('search-input').MDCTextField.focus();

const mainDataTable = document.getElementById('main-data-table').MDCDataTable;
mainDataTable.listen('MDCDataTable:rowSelectionChanged', function (event) {
    const buttonEl = document.getElementById('delete-event-dialog-button');
    if(event.selected) {
        buttonEl.disabled = false;
    } else {
        const selected = mainDataTable.getSelectedRowIds();
        buttonEl.disabled = selected.length<1;
    }
});

mainDataTable.listen('MDCDataTable:selectedAll', function () {
    document.getElementById('delete-event-dialog-button').disabled = mainDataTable.getRows()<1;
});

mainDataTable.listen('MDCDataTable:unselectedAll', function () {
    document.getElementById('delete-event-dialog-button').disabled = true;
});

const filterChipSet = document.getElementById('filter-chip-set').MDCChipSet;
filterChipSet.listen('MDCChip:removal', function (event) {
    onDeleteSubjectFromFilter(event.detail.chipId);
});

document.getElementById('add-event-dialog').MDCDialog.scrimClickAction = '';

const confirmDeleteDialog = document.getElementById('del-file-dialog').MDCDialog;
confirmDeleteDialog.listen('MDCDialog:closed', (e) => {

    if (e.detail.action === 'delete') {
        onConfirmedDeleteFile();
    }
});

const confirmDeleteEventDialog = document.getElementById('del-event-dialog').MDCDialog;
confirmDeleteEventDialog.listen('MDCDialog:closed', (e) => {

    if (e.detail.action === 'delete') {
        onConfirmedDeleteEvent();
    }
});

const menuOpenClass = 'mdc-menu-surface mdc-menu-surface--open';
const menuCloseClass = 'mdc-menu-surface';

const searchResultListEl = document.getElementById('search-result-list');
const searchResultListContainerEl = document.getElementById('search-result-list-container')
const searchResultList = searchResultListEl.MDCList
searchResultList.listen('MDCList:action', (e) => {
    const elements = searchResultList.listElements;
    if (e.detail.index >= 0 && e.detail.index < elements.length) {
        searchResultListContainerEl.className = menuCloseClass;
        onAddSubjectToFilter(elements[e.detail.index]);
    }
});

const searchEventResultListEl = document.getElementById('event-subject-result-list');
const searchEventResultListContainerEl = document.getElementById('event-subject-result-container');
const searchEventResultList = searchEventResultListEl.MDCList
searchEventResultList.listen('MDCList:action', (e) => {
    const elements = searchEventResultList.listElements;
    if (e.detail.index >= 0 && e.detail.index < elements.length) {
        searchEventResultListContainerEl.className = menuCloseClass;
        const form = document.forms['add-event-form'];
        form.SubjectId.value = elements[e.detail.index].getAttribute('data-id');
        document.getElementById('event-subject').MDCTextField.value = elements[e.detail.index].getAttribute('data-name') + ' ' + form.SubjectId.value;

        // Enable Add button if description already specified
        document.getElementById('add-event-button').disabled = form.Description.value.trim().length<1;
    }
});

const countSelect = document.getElementById('count-select').MDCSelect;

countSelect.selectedIndex = selectedCountIndex;

countSelect.listen('MDCSelect:change', () => {
    const form = document.forms['events-form'];

    if (form.count.value === countSelect.value) return;

    localStorage.setItem(selectedCountName, countSelect.value);

    form.count.value = countSelect.value;
    form.offset.value = 0;

    mainDataTable.showProgress();
    form.submit();
});

/** End of  MDC Web components initialization section */

/** Pagination section */
function onFirstPage(form) {
    form.offset.value = 0;

    mainDataTable.showProgress();
    form.submit();
}

function onLastPage(form) {
    const total = mainListTotal;

    if (total <= form.count.value) {
        return onFirstPage();
    }

    form.offset.value = (total / form.count.value >> 0) * form.count.value;
    if (total % form.count.value === 0) {
        form.offset.value -= form.count.value;
    }

    mainDataTable.showProgress();
    form.submit();
}

function onPrevPage(form) {
    const offset = form.offset.value - form.count.value;
    if (offset < 0) {
        return onFirstPage(form);
    }
    form.offset.value = offset;

    mainDataTable.showProgress();
    form.submit();
}

function onNextPage(form) {
    const total = mainListTotal;
    const offset = Number(form.offset.value) + Number(form.count.value);
    if (offset >= total) {
        return onLastPage(form);
    }
    form.offset.value = offset;

    mainDataTable.showProgress();
    form.submit();
}
/** End of pagination section */

/**
 * Add file to event
 * @param {any} eventId event identifier
 */
function onAddEventFile(eventId) {
    const form = document.forms[0];
    form.eventId.value = eventId;
    document.getElementById('file-upload-dialog').MDCDialog.open();
}

/**
 * Delete file from event
 * @param {any} fileId file identifier
 */
function onDeleteFile(fileId) {
    confirmDeleteDialog.fileId = fileId;
    confirmDeleteDialog.open();
}

/** Send delete file request to backend */
function onConfirmedDeleteFile() {

    const fileId = confirmDeleteDialog.fileId;

    confirmDeleteDialog.fileId = null;

    if (!fileId) return;

    var displayError = (err) => {
        const errId = 'err' + fileId;
        let e = document.getElementById(errId);
        if (!e) {
            e = document.createElement('div');
            relEl.appendChild(e);
        }

        e.id = 'err' + fileId;
        e.innerHTML = err;
        e.style.color = 'red';
    }

    const relEl = document.getElementById('file' + fileId);

    const formData = new FormData();
    formData.append('id', fileId);

    fetch('/Home/DeleteFile', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            relEl.remove();
        } else {
            response.text().then(text => {
                if (text) {
                    displayError('Error: ' + text);
                } else {
                    displayError('Error: ' + response.status + ' ' +
                        response.statusText);
                }
            }).catch(() => displayError('Error: ' + response.statusText));
        }
    })
    .catch((error) => {
        displayError('Error: ' + error);
    });
}

/**
 * Select file event handler on the Upload File dialog
 * @param {any} ctrl input file control HTMLInputElement
 */
function onChangeFile(ctrl) {
    document.getElementById('fileName').value = ctrl.files[0].name;
    document.getElementById('upload-button').disabled = !ctrl.files[0].name;
}

/**
 * Update controls state of the Upload File dialog
 * @param {any} state true, to enable dialog controls, disable otherwise
 */
function enableUploadDialog(state) {
    const fileUploadEl = document.getElementById('file-upload-wrapper');
    fileUploadEl.disabled = !state;

    if (state) {
        fileUploadEl.classList.remove('disabled-file-input');
    } else {
        fileUploadEl.classList.add('disabled-file-input');
    }

    document.getElementById('fileName').disabled = !state;
    document.getElementById('formFile').disabled = !state;
    document.getElementById('upload-button').disabled = !state;
}

/**
 * Send add file request to backend
 * @param {any} form add file form data
 */
function onUpload(form) {

    var resultElement = form.elements.namedItem('result');

    const formData = new FormData(form);

    resultElement.value = 'Uploading file...';
    resultElement.style.color = null;

    enableUploadDialog(false);

    fetch(form.action, {
        method: 'POST',
        body: formData
    }).then(response => {
        enableUploadDialog(true);
        if (response.ok) {
            //document.getElementById('file-upload-dialog').MDCDialog..close('uploaded');
            //window.location.href = href;
            const eventsForm = document.forms['events-form'];
            resultElement.value = 'File was uploaded successfully';
            mainDataTable.showProgress();
            eventsForm.submit();
        } else {
            response.text().then(text => {
                resultElement.style.color = 'red';
                if (text) {
                    resultElement.value = 'Error: ' + text;
                } else {
                    resultElement.value = 'Error: ' + response.status + ' ' +
                        response.statusText;
                }
            });
        }
    }).catch((error) => {
        enableUploadDialog(true);
        resultElement.value = 'Error: ' + error;
        resultElement.style.color = 'red'
    });
}

/** Filter events by subject identifier section */

/**
 * Key down event handler for the subject selector control  
 * @param {*} event event object
 * @param {*} resultListEl Html element for list of returned subjects 
 * @param {*} resultListContainerEl Html element to hold a whole search result
 * @param {*} excludes array id identifiers that have to be excluded from search result (already selected items)
 */
function onSearchInputKeyDown(event, resultListEl, resultListContainerEl, excludes) {
    switch (event.key) {
        case 'Enter':
        case 13:
            onSearchSubject(event, resultListEl, resultListContainerEl, excludes, true);
            event.stopPropagation();
            break;
        case 'Escape':
            if (resultListContainerEl.className !== menuCloseClass) {
                resultListContainerEl.className = menuCloseClass;
                event.stopPropagation();
            }
            break;
        case 'ArrowDown':
            if (resultListContainerEl.className !== menuCloseClass) {
                resultListEl.children[0].focus();
                event.stopPropagation();
            }
            break;
    }
}

/** Wrapper */
function onSearchFilterInputKeyDown(event) {
    return onSearchInputKeyDown(event, searchResultListEl, searchResultListContainerEl, filterChipSet.chips.map(c=>c.id))
}

/** Wrapper */
function onSearchEventInputKeyDown(event) {
    return onSearchInputKeyDown(event, searchEventResultListEl, searchEventResultListContainerEl, []);
}

/** Wrapper */
function onSearchFilterSubject(event) {
    onSearchSubject(event, searchResultListEl, searchResultListContainerEl, filterChipSet.chips.map(c=>c.id), false)
}

/** Wrapper */
function onSearchEventSubject(event) {
    onSearchSubject(event, searchEventResultListEl, searchEventResultListContainerEl, [], false)
}

/**
 * Input event handler for Event Description text area
 * @param {*} event event object
 */
function onInputEventDescription(event) {
    const form = document.forms['add-event-form'];
    if(form.SubjectId.value)
    {
        // Enable Add button if subject id already specified
        document.getElementById('add-event-button').disabled = event.target.value.trim().length<1;
    }
}

var searchTimerId = null; // Start search subject timer id 

/**
 * Start delayed search subject
 * @param {*} event event object
 * @param {*} resultListEl Html element for list of returned subjects 
 * @param {*} resultListContainerEl Html element to hold a whole search result
 * @param {*} excludes array id identifiers that have to be excluded from search result (already selected items)
 * @param {*} now if true then start search immediately
 * @returns 
 */
function onSearchSubject(event, resultListEl, resultListContainerEl, excludes, now) {

    clearTimeout(searchTimerId);

    let timeout = 0;
    const search = event.target.value.trim();
    
    if(!now) {
        switch (search.length) {
            case 0:
                return;
            case 1:
                timeout = 2000;
                break;
            case 2:
                timeout = 1000;
                break;
            default:
                timeout = 500;
                break;
        }
    }

    searchTimerId = setTimeout(() => {
        startSearch(search, resultListEl, resultListContainerEl, excludes);
    }, timeout);
}

/**
 * Send search subject request to backend
 * @param {*} resultListEl Html element for list of returned subjects 
 * @param {*} resultListContainerEl Html element to hold a whole search result
 * @param {*} excludes array id identifiers that have to be excluded from search result (already selected items)
 * @param {*} now if true then start search immediately
 * @returns 
 */
function startSearch(search, resultListEl, resultListContainerEl, excludes) {
    var itemsHtml = (result, item) => result
        + `<li class="mdc-list-item" data-id="${item.id}" data-name="${item.name}" tabindex="-1" role="menuitem">
<span class="mdc-list-item__ripple"></span>
<span class="mdc-list-item__text">
<span class="mdc-list-item__primary-text">${item.id}</span>
<span class="mdc-list-item__secondary-text">${item.name}</span>
</span></li>`;

    var addItem = (name) => {
        resultListEl.innerHTML = itemsHtml('', { id: '', name });
    }

    if (search) {
        const formData = new FormData();
        formData.append('search', search);

        excludes.forEach(id => formData.append('exclude', id));

        fetch('/Home/Subjects', {
            method: 'POST',
            body: formData
        }).then(response => {
            if (response.ok) {
                response.json().then(items => {
                    if (items) {
                        if (items.length < 1) {
                            addItem('No subjects');
                        } else {
                            resultListEl.innerHTML = items.reduce(itemsHtml, '');
                            resultListEl.children[0].tabIndex = 0;
                        }
                    } else {
                        addItem('No subjects');
                    }
                }).catch((e) => addItem('Error: ' + e));

            } else {
                response.text().then(text => {
                    if (text) {
                        addItem('Error: ' + text);
                    } else {
                        addItem('Error: ' + response.status + ' ' +
                            response.statusText);
                    }
                }).catch(() => addItem('Error: ' + response.statusText));
            }
        })
            .catch((error) => {
                addItem('Error: ' + error);
            });

        resultListContainerEl.className = menuOpenClass
    } else {
        resultListContainerEl.className = menuCloseClass
        // Clear list
        resultListEl.replaceChildren();
    }
}

/**
 * Filter events by subject id ChipSet chip removal event handler
 * @param {*} chipId chip identifier (same as subject id)
 */
function onDeleteSubjectFromFilter(chipId) {
    searchResultListContainerEl.className = menuCloseClass;

    const form = document.forms['events-form'];
    form.offset.value = 0;
    form.subjects.value = form.subjects.value.replace(chipId, '');

    localStorage.setItem(filterSubjects, form.subjects.value);

    mainDataTable.showProgress();
    form.submit();
}

/**
 * Filter events by subject id ChipSet add subject to filter event handler
 * @param {*} item selected subject list item (HtmElement)
 */
function onAddSubjectToFilter(item) {
    const itemId = item.getAttribute('data-id');

    if (!itemId) {
        return;
    }

    const form = document.forms['events-form'];
    form.offset.value = 0;
    form.subjects.value += (form.subjects.value.trim() ? ',' : '') + itemId;

    localStorage.setItem(filterSubjects, form.subjects.value);

    mainDataTable.showProgress();
    form.submit();
}
/** End of filter events by subject identifier section */

/**
 * Display the Add Event dialog
 */
function onDialogAddEvent() {
    document.getElementById('add-event-dialog').MDCDialog.open();
}

/**
 * Update controls state of the Add Event dialog
 * @param {any} state true, to enable dialog controls, disable otherwise
 */
function enableAddEventDialog(state) {
    document.getElementById('event-subject').disabled = !state;
    document.getElementById('event-description').disabled = !state;
    document.getElementById('add-event-button').disabled = !state;
}

/**
 * Send add event request to backend
 * @param {*} form event form data 
 */
function onAddEvent(form) {
    var resultElement = form.elements.namedItem('result');

    const formData = new FormData(form);

    resultElement.value = 'Saving event...';
    resultElement.style.color = null;

    enableAddEventDialog(false);

    fetch(form.action, {
        method: 'POST',
        body: formData
    }).then(response => {
        enableAddEventDialog(true);
        if (response.ok) {
            const eventsForm = document.forms['events-form'];
            resultElement.value = 'Event was added successfully';
            onFirstPage(eventsForm);
        } else {
            response.text().then(text => {
                resultElement.style.color = 'red';
                if (text) {
                    resultElement.value = 'Error: ' + text;
                } else {
                    resultElement.value = 'Error: ' + response.status + ' ' +
                        response.statusText;
                }
            });
        }
    }).catch((error) => {
        enableAddEventDialog(true);
        resultElement.value = 'Error: ' + error;
        resultElement.style.color = 'red'
    });
}

/**
 * Delete selected events
 */
function onDeleteSelectedEvents() {
    confirmDeleteEventDialog.open();
}

/**
 * Send delete events request to backend
 */
function onConfirmedDeleteEvent() {
    const events = mainDataTable.getSelectedRowIds();

    if(events.length<1){
        return;
    }
    
    const eventsForm = document.forms['events-form'];
    const resultElement = eventsForm.elements.namedItem('result');

    const formData = new FormData();
    events.forEach(id => {
        formData.append('ids', id);
    });

    var displayError = (err) => {
        resultElement.value = err;
        resultElement.style.color = 'red';
    }

    fetch('/Home/DeleteEvents', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            resultElement.value = 'Events were deleted successfully';
            onFirstPage(eventsForm);
        } else {
            response.text().then(text => {
                if (text) {
                    displayError('Error: ' + text);
                } else {
                    displayError('Error: ' + response.status + ' ' +
                        response.statusText);
                }
            }).catch(() => displayError('Error: ' + response.statusText));
        }
    })
    .catch((error) => {
        displayError('Error: ' + error);
    });
}