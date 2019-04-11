/**
 *
 *
 * @author carpincho
 * @since 04/03/19.
 * @version 1.0
 */
(($) => {
    'use strict';

    const API_URL = 'https://task-backend-fpuna.herokuapp.com/tasks';
    const TASK_STATUS = {
        PENDING: 'PENDIENTE',
        DONE: 'TERMINADO'
    };

    class Task {
        constructor(description) {
            this.id = null;
            this.description = description;
            this.status = TASK_STATUS.PENDING;
            this.date = new Date().toUTCString();
        }
    }

    /**
     * This method is executed once the page have just been loaded and call the service to retrieve the
     * list of tasks
     */
    $(document).ready(function(){
        $.ajax({
            url: API_URL,
            type: 'GET',
            error: function(data){
                showError(data)
            },
            success: function(data){
                loadTasks(data);
            }
        });
    });

    /**
     * This method displays an error on the page.
     * @param code the status code of the HTTP response.
     * @param text error message
     */
    const showError = (code, text) => {
        let errorBar = $('.error-bar');
        errorBar.html(`${text}. Cod error: ${code}`);
        errorBar.removeClass('hide-bar');
        errorBar.addClass('show-bar');
        setTimeout(() => {
            errorBar.removeClass('show-bar');
            errorBar.addClass('hide-bar');
        }, 3000);
    };


    /**
     * This method receives the list of tasks and calls the method to add each of them to the page
     *
     * @param array the string coming on the body of the API response
     */
    const loadTasks = (array) => {

        let tasks = array
        for (let i in tasks) {
            if (tasks.hasOwnProperty(i)) {
                addTaskToList(tasks[i]);
            }
        }
    };

    /**
     * Send the request to the API to create a new task
     *
     * @param e the event from the click on the new item button
     * @return {boolean}
     */
    const addTask = (e) => {
        let content = $('#new-task').val();
        if (content.length === 0) return false;

        e.preventDefault();
        $.ajax({
            url: API_URL,
            type: 'POST',
            data: JSON.stringify({description: content}),
            dataType: 'json',
            contentType: 'application/json',
            error: function(data){
                showError(data.status, `Error al crear la tarea: ${data.statusText}`)
            },
            success: function(data){
                addTaskToList(data);
                $('#new-task').val('');
            }
        });
        return false;
    };

    /**
     * This procedure links the new task button the addTask method on the click event.
     */
    $('.add').click(function(e){
        addTask(e);
    })
    
    /**
     * We associate a function to manipulate the DOM once the checkbox value is changed.
     * Change the task to the completed or incomplete list (according to the status)
     */
    const addOnChangeEvent = (task) => {
        $(`#task-${task.id}>label>input`)[0].onchange = (e) => {
            const newState = e.target.checked;
            $.ajax({
                url: `${API_URL}/${task.id}`,
                type: 'PUT',
                contentType: "application/json",
                data: JSON.stringify({status: newState ? 'TERMINADO' : 'PENDIENTE'}),
                accept: {
                    json: 'application/json'
                },
                error: function(data){
                    showError(data.status, `Error al actualizar la tarea: ${data.statusText}`)
                },
                success: function(data){
                    $(`#task-${task.id}`).remove();
                    addTaskToList(data);
                }
            });
        };
    };

    /**
     * This method modifies the DOM HTML to add new items to the task list.
     * @param task the new task.
     */
    const addTaskToList = (task) => {
        let html = `
        <li id="task-${task.id}">
            <label><input type="checkbox" ${task.status === TASK_STATUS.DONE ? "checked" : ""}/> ${task.description}</label>
            <button class="edit" data-id="${task.id}">Editar</button>
            <button class="delete" data-id="${task.id}">Borrar</button>
        </li>
        
        `;

        let group = ''
        if (task.status  === TASK_STATUS.PENDING) group = '#incomplete-tasks'
        else group = '#completed-tasks'

        $(group).append(html);
        $(group +' .edit').click((e) => editTask(e));
        $(group +' .delete').click((e) => removeTask(e));

        addOnChangeEvent(task);
    };

    /**
     * This method modifies the DOM HTML to display a form that allow the user to change the
     * task description and send a PUT request to modify it on the server side
     *
     * @param e
     */
    const editTask = (e) => {
        // We retrieve the value of the attribute data-id;
        const id = e.target.dataset.id;


        
        let currentDOMTask = document.getElementById(`task-${id}`);
        currentDOMTask.querySelector("label > input[type=checkbox]").remove();

        let currentTask = new Task(currentDOMTask.querySelector("label").innerHTML.trim());
        currentTask.id = id;

        currentDOMTask.querySelector('label').remove();

        let inputText = document.createElement('input');
        inputText.setAttribute('id', `task-edit-${currentTask.id}`);
        inputText.setAttribute('type', 'text');
        inputText.setAttribute('value', currentTask.description);

        /**
         * We associate the event click on the button ok, to send a PUT request to the server.
         */
        let buttonOK = document.createElement('button');
        buttonOK.innerText = 'OK';
        buttonOK.setAttribute('id', `ok-button-${currentTask.id}`);
        buttonOK.onclick = () => {
            currentTask.description = $(`#task-edit-${currentTask.id}`).val();
            $.ajax({
                url: `${API_URL}/${currentTask.id}`,
                type: 'PUT',
                contentType: "application/json",
                data: JSON.stringify({description: currentTask.description}),
                accept: {
                    json: 'application/json'
                },
                error: function(data){
                    showError(data.status, `Error al actualizar la tarea: ${data.statusText}`)
                },
                success: function(data){
                    revertHTMLChangeOnEdit(data);
                }
            });
        };

        let buttonCancel = document.createElement('button');
        buttonCancel.innerText = 'Cancel';
        buttonCancel.setAttribute('id', `cancel-button-${currentTask.id}`);
        buttonCancel.onclick = () => revertHTMLChangeOnEdit(currentTask);

        currentDOMTask.insertBefore(buttonCancel, currentDOMTask.children[0]);
        currentDOMTask.insertBefore(buttonOK, currentDOMTask.children[0]);
        currentDOMTask.insertBefore(inputText, currentDOMTask.children[0]);

        currentDOMTask.querySelector('.edit').style.visibility = 'hidden';
        currentDOMTask.querySelector('.delete').style.visibility = 'hidden';

        inputText.focus();
    };

    /**
     * This method removes the form displayed to edit the task and show it as a task item.
     * @param currentTask the string coming from the API
     */
    const revertHTMLChangeOnEdit = (currentTask) => {
        let task = currentTask instanceof Task || typeof currentTask === 'object' ? currentTask : JSON.parse(currentTask);

        let currentDOMTask = document.getElementById(`task-${task.id}`);
        currentDOMTask.querySelector('input[type=text]').remove();

        let label = document.createElement('label');

        currentDOMTask.insertBefore(label, currentDOMTask.children[0]);
        label.innerHTML = `<input type="checkbox"/> ${task.description}`;
        addOnChangeEvent(task);

        currentDOMTask.insertBefore(label, currentDOMTask.children[0]);
        currentDOMTask.querySelector(`button#ok-button-${task.id}`).remove();
        currentDOMTask.querySelector(`button#cancel-button-${task.id}`).remove();

        currentDOMTask.querySelector('.edit').style.visibility = 'visible';
        currentDOMTask.querySelector('.delete').style.visibility = 'visible';
    };

    /**
     * This methods removes the task item associated to the DOM of the page
     * @param id the identifier from the task
     */
    const removeTaskFromList = (id) => {
        $(`#task-${id}`).remove();
    };

    /**
     * This method sends a DELETE request to remove the task from the server.
     * @param e
     */
    const removeTask = (e) => {
        const id = e.target.dataset.id;
        $.ajax({
            url: `${API_URL}/${id}`,
            type: 'DELETE',
            dataType: 'json',
            contentType: 'application/json',
            error: function(data){
                if(data.status === 200 && data.statusText === 'OK') {
                    removeTaskFromList(id)
                    return null
                }
                showError(data.status, `Error al eliminar la tarea: ${data.statusText}`)
            },
            success: function(data){
                removeTaskFromList(id)
            }
        });
    };
})(jQuery);
