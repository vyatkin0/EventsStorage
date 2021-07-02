/** Initialize MDC Web components. */
mdc.autoInit();

document.getElementById('search-input').MDCTextField.focus();

const filterChipSet = document.getElementById('filter-chip-set').MDCChipSet;
filterChipSet.listen('MDCChip:removal', function (event) {
    onDeleteFilterIndex(event.detail.chipId);
});

document.getElementById('add-event-dialog').MDCDialog.scrimClickAction = '';

const confirmDeleteDialog = document.getElementById('del-file-dialog').MDCDialog;
confirmDeleteDialog.listen('MDCDialog:closed', (e) => {

    if (e.detail.action === 'delete') {
        onConfirmedDeleteFile();
    }
});

const searchResultListEl = document.getElementById('search-result-list');
const searchResultListContainerEl = document.getElementById('search-result-list-container')
const searchResultList = searchResultListEl.MDCList
searchResultList.listen('MDCList:action', (e) => {
    const elements = searchResultList.listElements;
    if (e.detail.index >= 0 && e.detail.index < elements.length) {
        searchResultListContainerEl.style.display = 'none';
        onAddFilterIndex(elements[e.detail.index]);
    }
});

const searchEventResultListEl = document.getElementById('event-subject-result-list');
const searchEventResultListContainerEl = document.getElementById('event-subject-result-container');
const searchEventResultList = searchEventResultListEl.MDCList
searchEventResultList.listen('MDCList:action', (e) => {
    const elements = searchEventResultList.listElements;
    if (e.detail.index >= 0 && e.detail.index < elements.length) {
        searchEventResultListContainerEl.style.display = 'none';
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
    form.submit();
});

/** MDC Web components initialization finished */

/** Управление постраничным выводом данных */
function onFirstPage(form) {
    form.offset.value = 0;
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
    form.submit();
}

function onPrevPage(form) {
    const offset = form.offset.value - form.count.value;
    if (offset < 0) {
        return onFirstPage(form);
    }
    form.offset.value = offset;
    form.submit();
}

function onNextPage(form) {
    const total = mainListTotal;
    const offset = Number(form.offset.value) + Number(form.count.value);
    if (offset >= total) {
        return onLastPage(form);
    }
    form.offset.value = offset;
    form.submit();
}
/** Конец управление постраничным выводом данных */

/**
 * Добавление файла данных по изменениям
 * @param {any} eventId идентификатор события
 */
function onAddEventFile(eventId) {
    const form = document.forms[0];
    form.eventId.value = eventId;
    document.getElementById('file-upload-dialog').MDCDialog.open();
}

/**
 * Удаление файла данных по изменениям
 * @param {any} fileId идентификатор связи событие-файл
 */
function onDeleteFile(fileId) {
    confirmDeleteDialog.fileId = fileId;
    confirmDeleteDialog.open();
}

/** Оправка запроса на сервер на удаление файла данных по изменениям */
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

    const relEl = document.getElementById('relation' + fileId);

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
 * Обработчик события выбора файла в диалоге загрузки
 * @param {any} ctrl
 */
function onChangeFile(ctrl) {
    document.getElementById('fileName').value = ctrl.files[0].name;
    document.getElementById('upload-button').disabled = !ctrl.files[0].name;
}

/**
 * Обновление состояния элементов управления диалога загрузки файлов
 * @param {any} state если true, то элеенты управленя разрешены
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
 * Оправка запроса на сервер на добавление файла данных по изменениям
 * @param {any} form форма данных, которая будет обновлена после успешной загрузки файла на сервер
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

/** Свойства и методы для панели фильтра по коду или имени компонентов */
function onSearchInputKeyDown(event, resultListEl, resultListContainerEl, excludes) {
    switch (event.key) {
        case 'Enter':
        case 13:
            startSearch(event.target.value.trim(), resultListEl, resultListContainerEl, excludes);
            break;
        case 'Escape':
            resultListContainerEl.style.display = 'none';
            break;
        case 'ArrowDown':
            if (resultListContainerEl.style.display !== 'none') {
                resultListEl.children[0].focus();
            }
            break;
    }

    event.stopPropagation();
}

function onSearchFilterInputKeyDown(event) {
    return onSearchInputKeyDown(event, searchResultListEl, searchResultListContainerEl, filterChipSet.chips.map(c=>c.id))
}

function onSearchEventInputKeyDown(event) {
    return onSearchInputKeyDown(event, searchEventResultListEl, searchEventResultListContainerEl, []);
}

function onSearchFilterSubject(event) {
    onSearchSubject(event, searchResultListEl, searchResultListContainerEl, filterChipSet.chips.map(c=>c.id))
}

function onSearchEventSubject(event) {
    onSearchSubject(event, searchEventResultListEl, searchEventResultListContainerEl, [])
}

function onInputEventDescription(event) {
    const form = document.forms['add-event-form'];
    if(form.SubjectId.value)
    {
        // Enable Add button if subject id already specified
        document.getElementById('add-event-button').disabled = event.target.value.trim().length<1;
    }
}

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

        resultListContainerEl.style.display = 'block';
    } else {
        resultListContainerEl.style.display = 'none';
        // Clear list
        resultListEl.replaceChildren();
    }
}

var searchTimerId = null;
function onSearchSubject(e, resultListEl, resultListContainerEl, excludes) {

    clearTimeout(searchTimerId);

    let timeout = 500;
    const search = e.target.value.trim();
    switch (search.length) {
        case 0:
            return;
        case 1:
            timeout = 2000;
            break;
        case 2:
            timeout = 1000;
            break;
    }

    searchTimerId = setTimeout(() => {
        startSearch(search, resultListEl, resultListContainerEl, excludes);
    }, timeout);
}

function onDeleteFilterIndex(chipId) {
    searchResultListContainerEl.style.display = 'none';

    const form = document.forms['events-form'];
    form.offset.value = 0;
    form.subjects.value = form.subjects.value.replace(chipId, '');

    localStorage.setItem(filterSubjects, form.subjects.value);

    form.submit();
}

function onAddFilterIndex(item) {
    const itemId = item.getAttribute('data-id');

    if (!itemId) {
        return;
    }

    const form = document.forms['events-form'];
    form.offset.value = 0;
    form.subjects.value += (form.subjects.value.trim() ? ',' : '') + itemId;

    localStorage.setItem(filterSubjects, form.subjects.value);

    form.submit();
}
/** Конец свойства и методы для панели фильтра по коду или названию компонентов */

function onDialogAddEvent() {
    document.getElementById('add-event-dialog').MDCDialog.open();
}

function enableAddEventDialog(state) {
    document.getElementById('event-subject').disabled = !state;
    document.getElementById('event-description').disabled = !state;
    document.getElementById('add-event-button').disabled = !state;
}

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
        enableAddEventDialog(true);
        resultElement.value = 'Error: ' + error;
        resultElement.style.color = 'red'
    });
}