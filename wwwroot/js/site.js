// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

/** Initialize MDC Web components. */
const buttons = document.querySelectorAll('.mdc-button');
for (const button of buttons) {
    if (button.id !== 'fileUploadWrapper') {
        mdc.ripple.MDCRipple.attachTo(button);
    }
}

const iconButtons = document.querySelectorAll('.mdc-icon-button');
for (const button of iconButtons) {
    mdc.ripple.MDCRipple.attachTo(button);
}

const formField = document.querySelector('.mdc-form-field');
if (formField) {
    const mdcFormField = mdc.formField.MDCFormField.attachTo(formField);

    const switches = document.querySelectorAll('.mdc-switch');
    if (switches) {
        for (const s of switches) {

            const mdcCtrl = mdc.switchControl.MDCSwitch.attachTo(s);
            if (s.id === 'replace') {
                mdcFormField.input = mdcCtrl;
            }
        }
    }
}

const textFields = document.querySelectorAll('.mdc-text-field');
if (textFields) {
    for (const textField of textFields) {
        const mdcTextField = mdc.textField.MDCTextField.attachTo(textField);
        if (textField.id === 'search-input-id') {
            mdcTextField.focus();
        }
    }
}

var searchResultList = null;
const lists = document.querySelectorAll('.mdc-list');
if (lists) {
    for (const list of lists) {
        const l = mdc.list.MDCList.attachTo(list);

        if (list.id === 'searchResultList') {
            searchResultList = l;

            searchResultList.listen('MDCList:action', (e) => {
                if (e.detail.index >= 0 && e.detail.index < searchResultList.listElements.length) {
                    onAddFilterIndex(searchResultList.listElements[e.detail.index]);
                }
            });
        }
    }
}

const drawers = document.querySelectorAll('.mdc-drawer');
for (const drawer of drawers) {
    mdc.drawer.MDCDrawer.attachTo(drawer);
}

const dataTables = document.querySelectorAll('.mdc-data-table');
for (const dataTable of dataTables) {
    mdc.dataTable.MDCDataTable.attachTo(dataTable);
}

const chipSetEl = document.querySelector('#filterChipSet');
var chipSet = null;
if (chipSetEl) {
    chipSet = mdc.chips.MDCChipSet.attachTo(chipSetEl);

    chipSet.listen('MDCChip:removal', function (event) {
        //console.log('MDCChip:removal');
        onDeleteFilterIndex(event.detail.chipId);
    });

    /*
    chipSet.listen('MDCChip:selection', function (event) {
        console.log('MDCChip:selection');
    });

    chipSet.listen('MDCChip:interaction', function (event) {
        console.log('MDCChip:interaction');
    });
    */
}

var uploadSelect = null;
const uploadSelectEl = document.querySelector('#selectUploadType')
if (uploadSelectEl) {
    uploadSelect = mdc.select.MDCSelect.attachTo(uploadSelectEl);
}

const select = document.querySelector('#selectCount')
const countSelect = mdc.select.MDCSelect.attachTo(select);
countSelect.selectedIndex = selectedCountIndex;

countSelect.listen('MDCSelect:change', () => {
    const form = document.forms['mainForm'];

    if (form.count.value === countSelect.value) return;

    localStorage.setItem(selectedCountName, countSelect.value);

    form.count.value = countSelect.value;
    form.offset.value = 0;
    form.submit();
});

const fileUpload = document.querySelector('#file-upload-dialog');

const uploadDialog = mdc.dialog.MDCDialog.attachTo(fileUpload);

const deleteFile = document.querySelector('#del-file-dialog');
var confirmDeleteDialog = null;
if (deleteFile) {
    confirmDeleteDialog = mdc.dialog.MDCDialog.attachTo(deleteFile);
    confirmDeleteDialog.listen('MDCDialog:closed', (e) => {

        if (e.detail.action === 'delete') {
            onConfirmedDeleteRelation();
        }
    });
}

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

/** Добавление файла данных по артефактам */
function onAddFile() {
    uploadDialog.open();
}

/**
 * Добавление файла данных по изменениям
 * @param {any} eventId идентификатор события
 */
function onAddEventFile(eventId) {
    const form = document.forms[0];
    form.eventId.value = eventId;
    uploadDialog.open();
}

/**
 * Удаление файла данных по изменениям
 * @param {any} relationId идентификатор связи событие-файл
 */
function onDeleteRelation(relationId) {
    confirmDeleteDialog.relationId = relationId;
    confirmDeleteDialog.open();
}

/** Оправка запроса на сервер на удаление файла данных по изменениям */
function onConfirmedDeleteRelation() {

    const relationId = confirmDeleteDialog.relationId;

    confirmDeleteDialog.relationId = null;

    if (!relationId) return;

    var displayError = (err) => {
        const errId = 'err' + relationId;
        let e = document.getElementById(errId);
        if (!e) {
            e = document.createElement('div');
            relEl.appendChild(e);
        }

        e.id = 'err' + relationId;
        e.innerHTML = err;
        e.style.color = 'red';
    }

    const relEl = document.getElementById('relation' + relationId);

    const formData = new FormData();
    formData.append('id', relationId);

    fetch('/ComponentEvent/Delete', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            relEl.remove();
        } else {
            response.text().then(text => {
                if (text) {
                    displayError('Ошибка: ' + text);
                } else {
                    displayError('Ошибка: ' + response.status + ' ' +
                        response.statusText);
                }
            }).catch(() => displayError('Ошибка: ' + response.statusText));
        }
    })
    .catch((error) => {
        displayError('Ошибка: ' + error);
    });
}

/**
 * Обработчик события выбора файла в диалоге загрузки
 * @param {any} ctrl
 */
function onChangeFile(ctrl) {
    document.getElementById('fileName').value = ctrl.files[0].name;
    document.getElementById('uploadButton').disabled = !ctrl.files[0].name;
}

/**
 * Обновление состояния элементов управления диалога загрузки файлов
 * @param {any} state если true, то элеенты управленя разрешены
 */
function enableUploadDialog(state) {
    const fileUploadEl = document.getElementById('fileUploadWrapper');
    fileUploadEl.disabled = !state;

    if (state) {
        fileUploadEl.classList.remove('disabled-file-input');
    } else {
        fileUploadEl.classList.add('disabled-file-input');
    }

    document.getElementById('fileName').disabled = !state;
    document.getElementById('formFile').disabled = !state;
    //document.getElementById('closeButton').disabled = !state;
    document.getElementById('uploadButton').disabled = !state;

    if (uploadSelectEl) {
        if (state) {
            uploadSelectEl.classList.remove('mdc-select--disabled');
        }
        else {
            uploadSelectEl.classList.add('mdc-select--disabled');
        }
    }

    const typeSwitch = document.getElementById('replace');
    if (typeSwitch) {
        typeSwitch.disabled = !state;

        if (state) {
            typeSwitch.classList.remove('mdc-switch--disabled');
        }
        else {
            typeSwitch.classList.add('mdc-switch--disabled');
        }
    }
}

/**
 * Оправка запроса на сервер на добавление файла данных по изменениям
 * @param {any} form форма данных, которая будет обновлена после успешной загрузки файла на сервер
 */
function onUpload(form) {

    if (uploadSelect) {
        form.fileType.value = uploadSelect.value;
    }
    else {
        form.fileType.value = 1;
    }

    var resultElement = form.elements.namedItem('result');

    const formData = new FormData(form);

    resultElement.value = 'Идёт загрузка и обработка файла...';
    resultElement.style.color = null;

    enableUploadDialog(false);

    fetch(form.action, {
        method: 'POST',
        body: formData
    }).then(response => {
        enableUploadDialog(true);
        if (response.ok) {
            //uploadDialog.close('uploaded');
            //window.location.href = href;
            const form = document.forms['mainForm'];
            resultElement.value = 'Файл успешно загружен';
            form.submit();
        } else {
            response.text().then(text => {
                resultElement.style.color = 'red';
                if (text) {
                    resultElement.value = 'Ошибка: ' + text;
                } else {
                    resultElement.value = 'Ошибка: ' + response.status + ' ' +
                        response.statusText;
                }
            });
        }
    }).catch((error) => {
        enableUploadDialog(true);
        resultElement.value = 'Ошибка: ' + error;
        resultElement.style.color = 'red'
    });
}

/** Свойства и методы для панели фильтра по коду или имени компонентов */
const resultListContainerEl = document.getElementById('searchResultListContainer');
const resultListEl = document.getElementById('searchResultList');

function onSearchInputKeyDown(event) {
    switch (event.key) {
        case 'Enter':
        case 13:
            startSearch(event.target.value.trim());
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
}

function startSearch(search) {
    var itemsHtml = (result, item) => result
        + `<li class='mdc-list-item' data-id='${item.id}' data-code='${item.code}' data-name='${item.name}' tabindex='-1'>
<span class='mdc-list-item__ripple'></span>
<span class='mdc-list-item__text'>
<span class='mdc-list-item__primary-text'>${item.name}</span>
<span class='mdc-list-item__secondary-text'>${item.code}</span>
</span></li>`;

    var addItem = (name) => {
        resultListEl.innerHTML = itemsHtml('', { id: '', code: '', name });
    }

    if (search) {
        const formData = new FormData();
        formData.append('search', search);

        chipSet.chips.forEach(c => formData.append('exclude', c.id));
        //formData.append('exclude', chipSet.chips.map(c=>c.id));

        fetch('/ComponentEvent/Components', {
            method: 'POST',
            body: formData
        }).then(response => {
            if (response.ok) {
                response.json().then(items => {
                    if (items) {
                        if (items.length < 1) {
                            addItem('Нет компонентов');
                        } else {
                            resultListEl.innerHTML = items.reduce(itemsHtml, '');
                            resultListEl.children[0].tabIndex = 0;
                        }
                    } else {
                        addItem('Нет компонентов');
                    }
                }).catch((e) => addItem('Ошибка: ' + e));

            } else {
                response.text().then(text => {
                    if (text) {
                        addItem('Ошибка: ' + text);
                    } else {
                        addItem('Ошибка: ' + response.status + ' ' +
                            response.statusText);
                    }
                }).catch(() => addItem('Ошибка: ' + response.statusText));
            }
        })
            .catch((error) => {
                addItem('Ошибка: ' + error);
            });

        resultListContainerEl.style.display = 'block';
    } else {
        resultListContainerEl.style.display = 'none';
        // Clear list
        resultListEl.replaceChildren();
    }
}

var searchTimerId = null;

function onSearchComponent(e) {

    clearTimeout(searchTimerId);

    let timeout = 500;
    const search = e.target.value.trim();
    switch (search.lenght) {
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
        startSearch(search);
    }, timeout);
}

function onDeleteFilterIndex(chipId) {
    resultListContainerEl.style.display = 'none';

    const form = document.forms['mainForm'];
    form.offset.value = 0;
    form.components.value = form.components.value.replace(chipId, '');

    localStorage.setItem(filterComponents, form.components.value);

    form.submit();
}

function onAddFilterIndex(item) {
    resultListContainerEl.style.display = 'none';

    const itemId = item.getAttribute('data-id');

    if (!itemId) {
        return;
    }

    const form = document.forms['mainForm'];
    form.offset.value = 0;
    form.components.value += (form.components.value.trim() ? ',' : '') + itemId;

    localStorage.setItem(filterComponents, form.components.value);

    form.submit();
}
/** Конец свойства и методы для панели фильтра по коду или названию компонентов */