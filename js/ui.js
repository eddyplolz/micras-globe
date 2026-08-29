/* -----------

Code related to UI controls

------------*/

//never want any hashes to appear in the URL when a modal is shown
window.REMODAL_GLOBALS = {
	DEFAULTS: {
		hashTracking: false
	}
}

function showError(error) {
	$("[data-remodal-id=modalError]").remodal().open();
	if (error != "") {
		$("#errorMessage").html("There was an error loading the image from Imgur:<p id='imgurError'>" + error + "</p>Please try again. If the issue persists, please let me know (contact info in the Help menu).");
	}
	else {
		$("#errorMessage").html("There was an error loading the image from Imgur:<p id='imgurError'></p>Please try again. If the issue persists, please let me know (contact info in the Help menu).");
	}
}

$(function() {
	$("[data-remodal-id=saveSuccess]").remodal({closeOnConfirm: false, closeOnCancel: false, closeOnEscape: false, closeOnOutsideClick: false});

	$("#imagesContext").on('click', function() {
		$("[data-remodal-id=modalUpload]").remodal().open();
	});

	$("#generateContext").on('click', function() {
		$("[data-remodal-id=modalGenerate]").remodal().open();
	});

	$(".toggle-button").on('click', function() {
		$(this).toggleClass("toggle-button-selected");
		$("#fileUpload").val("");
		$(".filePath, #imgurUrlBox").text("");
		$("#fileUploadLabel, #imgurWrapper").toggle();
	});

	$(".fileUpload").on('change', function() {
		// Only enable OK for an actual image. Choosing a non-image (or canceling the
		// picker) used to enable OK anyway, then the confirm path silently no-opped
		// because the thumbnail handler had rejected the file (audit L5).
		var file = this.files && this.files[0];
		var isImage = !!(file && file.type.match('image.*'));
		$('.remodal-confirm').prop('disabled', !isImage);
		$(".filePath").text(isImage ? this.value : "");
	});

	$("#imgurUrlBox").on('input', function() {
		if ($(this).val().length) {
			$('.remodal-confirm').prop('disabled', false);
		} else {
			$('.remodal-confirm').prop('disabled', true);
		}
	});

	$(document).on('confirmation', "[data-remodal-id=saveSuccess]", function(e) {
		if($("#keyURL").attr("copied") != "true") {
			alert("You may not have copied the key URL. The key URL is used to update this particular save. Without it, you will need to create a new save (and will get a new URL).")
		} else {
			$(this).remodal().close();
		}
	});

	$(document).on('opening', '.remodal', function(e) {
		if ($(this).attr('data-remodal-id') != "modalUpload")
			$('.remodal-confirm').prop('disabled', false);
	});

	$(document).on('closed', '.remodal', function (e) {
		$(".loaderWrapper").hide();
		$('.remodal-confirm').prop('disabled', true);
		$("#fileUpload").val("");
		$(".filePath, #imgurUrlBox").text("").val("");
		if ($(this).attr('data-remodal-id') == "generateWorking") {
			canceled = true;
			$("#gifImage").remove();
		}
	});

	$(document).on('confirmation', '[data-remodal-id=modalUpload]', function(e) {
		var use = $("#imageUse").val();
		if ($(".toggle-button").hasClass("toggle-button-selected")) {
			var file = $("#imgurUrlBox").val();
			loadImgur(file, use);
		} else {
			var files = $(".thumb-image")
			fileSelect(files);
		}
	});

	$("#axialTilt").on('change input', function() {
		$("output[for=" + $(this).attr('id') + "]").text($(this).val() + "°");
		setSphereTilt($(this).val());
	});

	$("#saveURL, #keyURL").on('focus', function() {
		this.select();
	});

	$("#keyURL").on('focus', function() {
		$("#keyURL").attr("copied", "true");
	});

	$(".fileUpload").on('change', function(evt) {
		var reader = new FileReader();
		// Guard files[0]: canceling the file picker can fire 'change' with an empty
		// list, and reading .type off undefined threw (audit L5).
		if (!this.files.length || !this.files[0].type.match('image.*')) {
			return;
		}
		var type = $(this).attr('id');
		var parent = $(this).parent();
		reader.onload = function(e) {
			if (parent.find(".thumb-image").length !== 0)
				$(".thumb-image", parent).remove();
			$("<img>", {
				"src": e.target.result,
				"class": "thumb-image",
				"id": parent.find(".fileUpload").attr("id")
			}).appendTo(parent);
		}
		reader.readAsDataURL($(this)[0].files[0]);
		if ($(this)[0].files[0].size > 10485760)
			alert("File size must be under 10MB to save");
	});
});
