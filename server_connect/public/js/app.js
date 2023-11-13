$(document).ready(()=>{
    var $j = jQuery.noConflict();
    const describe = $('#describe');
    const base64Id = $('#base64Id');
    const pithole64Id = $('#pithole64Id');
    const socket = io.connect(window.location.host); 
    $('#link').focus((e)=>{
        console.log('focus'+$('#link').val());
        $('#src_img').attr('src',$('#link').val().toString());
    });
    $(describe).on('click',(e)=>{
        $.post('/describe',{'link':$('#link').val()},(data)=>{
            console.log(data);
            $('#description').text(data);
        });
    });
    $(base64Id).on('click',(e)=>{
        $.post('/frombase64-describe',{'base64':$('#base64Img').val()},(data)=>{
        console.log(data);
            $('#description').text(data);
        });
    });
    $(pithole64Id).on('click',(e)=>{
        $.post('/detectPithole',{'base64':$('#pithole64').val()},(data)=>{
        console.log(data);
            $('#description').text(data);
        });
    });
});