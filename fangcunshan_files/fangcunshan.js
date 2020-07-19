$(function() {
	$(".m div").click(function(){
		var parent = $(this).parent();
		$(parent).children().attr("class", "");
		$(this).attr("class", "m-selected");
		$(parent).find("input").val(parse($(this).text()));
	});
	//当不使用满分券时，必须选择可放弃
	$("#quan").change(function(){
		if (0 == $(this).val()) {
			$("#giveup").val(1);
			$("#giveup").trigger("change");
		}
	});
	//限制input只能输入正数
	$("input").keyup(function(){
		if (!this.value.match(/^[\+\-]?\d*?\.?\d*?$/)) {
			this.value = this.t_value;
		} else {
			this.t_value = this.value;
		}
		if (this.value.match(/^(?:[\+\-]?\d+(?:\.\d+)?)?$/)) {
			this.o_value = this.value;
		}
	});
	$("input").blur(function(){
		if (!this.value.match(/^(?:[\+\-]?\d+(?:\.\d+)?|\.\d*?)?$/)) {
			this.value = this.o_value;
		} else {
			if (this.value.match(/^\.\d+$/)) {
				this.value = 0 + this.value;
			}
			if (this.value.match(/^\.$/)) {
				this.value = 0;
			}
			this.o_value = this.value;
		}
	});
	//放弃
	$("#giveup").change(function(){
		if ($(this).val() == "1") {
			$(".giveup").css("display", "inline");
		} else if ($(this).val() == "0") {
			$(".giveup").css("display", "none");
		}
	});
});

function parse(str) {
	if (str == "×") {
		return "*";
	} else if (str == "÷") {
		return "/";
	} else {
		return str;
	}
}

function reset() {
	$(".n").each(function(){
		$(this).children("input:first-child").val("");
		$(this).children("input").css("background-color", "white");
	});
	$("#tip").text("");
	$("#results").text("");
	$("#tip").css("display", "none");
	$("#later").text("0");
	$("#current").text("0");
}

function resetAll() {
	$(".n input").val("");
	$(".n input").attr("class", "");
	$(".m input").val("");
	$(".m div").attr("class", "");
	$("select").val("");
	$("#results").text("");
	$("#tip").text("");
	$("#tip").css("display", "none");
	$(".n input").css("background-color", "white");
	$("#later").text("0");
	$("#current").text("0");
}

function cal() {
	$("#results").text("");
	$("#tip").text("");
	$("#tip").css("display", "none");
	$("#later").text("0");
	$("#current").text("0");
	$(".n input").css("background-color", "white");
	//校验
	var validFlag = true;
	$("input, select").each(function(){
		if (!$(this).val() && $(this).css("display") != "none") {
			validFlag = false;
		}
	});
	$("input[type=hidden]").each(function(){
		if (!$(this).val()) {
			validFlag = false;
		}
	});
	if (!validFlag) {
		$("#tip").css("display", "block");
		$("#tip").css("color", "red");
		$("#tip").text("请检查是否有漏填、漏选项");
		$(".score").text("0");
		return;
	} else {
		$("#tip").css("display", "none");
	}
	
	
	/* -------------- 计算开始 ------------ */
	
	//加减乘除的满分值
	jiaMax = 1500;
	jianMax = 10;
	chengMax = 4;
	chuMax = 1.4;
	
	//用户填的各个数值
	luck = $("#luck").val();
	quan = $("#quan").val();
	var giveup = $("#giveup").val();
	var n1 = $("#n1").val();
	var n1g = $("#n1g").val();
	var n2 = $("#n2").val();
	var n2g = $("#n2g").val();
	var n3 = $("#n3").val();
	var n3g = $("#n3g").val();
	var n4 = $("#n4").val();
	var n4g = $("#n4g").val();
	var n5 = $("#n5").val();
	var n5g = $("#n5g").val();
	var n6 = $("#n6").val();
	var n6g = $("#n6g").val();
	var n7 = $("#n7").val();
	var n7g = $("#n7g").val();
	var m1 = $("#m1").val();
	var m2 = $("#m2").val();
	var m3 = $("#m3").val();
	var m4 = $("#m4").val();
	var m5 = $("#m5").val();
	var m6 = $("#m6").val();
	
	//当前分数
	var current = getScore(n1 + m1 + n2 + m2 + n3 + m3 + n4 + m4 + n5 + m5 + n6 + m6 + n7);
	$("#current").text(current);
	//当前分数已经命中2个幸运数字
	if (getCount(current, luck) >= 2) {
		$("#tip").css("display", "block");
		$("#tip").css("color", "blue");
		$("#tip").text("当前组合已命中2个幸运数字，无需用券");
		return;
	}
	
	//各位置的满分分数
	var n1Max = jiaMax;
	var n2Max = max(m1);
	var n3Max = max(m2);
	var n4Max = max(m3);
	var n5Max = max(m4);
	var n6Max = max(m5);
	var n7Max = max(m6);
	
	nArr = [n1, n2, n3, n4, n5, n6, n7];
	nMaxArr = [n1Max, n2Max, n3Max, n4Max, n5Max, n6Max, n7Max];
	nGArr = [n1g, n2g, n3g, n4g, n5g, n6g, n7g];
	
	//★★★★★执行算法★★★★★
	//分多种情况：
	//1：不使用放弃，使用一张满分券；
	//2：不使用放弃，使用二张满分券(此时包含情况1)；
	//3：使用放弃，不使用满分券；
	//4：使用放弃，使用一张满分券(此时包含情况1、3)；
	//5：使用放弃，使用二张满分券(此时包含情况1、2、3、4、5)；
	//结果的格式：[[分数, [满分券位置], [放弃位置]],   [分数, [满分券位置], [放弃位置]],   ... ]
	results = [];
	result = [];
	maxPosition = [];
	giveupPosition = [];
	
	if (giveup == "0" || (giveup == "1" && quan != "0")) {
		//使用一张满分券
		for (var i = 0; i < nArr.length; i++) {
			var temp = nArr[i];
			nArr[i] = nMaxArr[i];
			var tempS = nArr[0] + m1 + nArr[1] + m2 + nArr[2] + m3 + nArr[3] + m4 + nArr[4] + m5 + nArr[5] + m6 + nArr[6];
			var tempScore = getScore(tempS);
			nArr[i] = temp;
			
			var luckCount = getCount(tempScore, luck);
			if (luckCount >= 2) {
				$("#results").append("<span style='color:#FF5151;display:block'>" + (i+1) + "号位使用满分券：" + tempS + "=" + tempScore + "</span><br/>");
				console.info(tempS + "=" + tempScore);
				console.info("满分:" + i);
				maxPosition.push(i);
				result.push(tempScore);
				result.push(maxPosition);
				result.push([]);
				results.push(result);
				result = [];
				maxPosition = [];
			}
		}
		
		//使用二张满分券
		if (quan == 2) {
			for (var i = 0; i < nArr.length; i++) {
				for (var j = i+1; j < nArr.length; j++) {
					var tempI = nArr[i];
					var tempJ = nArr[j];
					nArr[i] = nMaxArr[i];
					nArr[j] = nMaxArr[j];
					var tempS = nArr[0] + m1 + nArr[1] + m2 + nArr[2] + m3 + nArr[3] + m4 + nArr[4] + m5 + nArr[5] + m6 + nArr[6];
					var tempScore = getScore(tempS);
					nArr[i] = tempI;
					nArr[j] = tempJ;
					
					var luckCount = getCount(tempScore, luck);
					if (luckCount >= 2) {
						$("#results").append("<span style='color:#FF5151;display:block'>" + (i+1) + "," + (j+1) + "号位使用满分券：" + tempS + "=" + tempScore + "</span><br/>");
						console.info(tempS + "=" + tempScore);
						console.info("满分:" + i + "," + j);
						maxPosition.push(i);
						maxPosition.push(j);
						result.push(tempScore);
						result.push(maxPosition);
						result.push(giveupPosition);
						results.push(result);
						result = [];
						maxPosition = [];
					}
				}
			}
		}
	}
	if (giveup == "1") {
		//所有放弃组合
		var allGroup = [];
		for (var i = 1; i <= 7; i++) {
			var group = giveupRecursion("1234567", i);
			for (var j = 0; j < group.length; j++) {
				allGroup.push(group[j]);
			}
		}
		
		//不使用满分券
		for (var i = 0; i < allGroup.length; i++) {
			var recovers = [];
			var g = allGroup[i]
			for (var j = 0; j < g.length; j++) {
				giveupPosition.push(parseInt(g.charAt(j))-1);
				var index = parseInt(g.charAt(j))-1;
				var tempJ = nArr[index];
				var recover = [];
				recover.push(index);
				recover.push(tempJ);
				recovers.push(recover);
				
				nArr[index] = nGArr[index];
			}
			var tempS = nArr[0] + m1 + nArr[1] + m2 + nArr[2] + m3 + nArr[3] + m4 + nArr[4] + m5 + nArr[5] + m6 + nArr[6];
			var tempScore = getScore(tempS);
			var luckCount = getCount(tempScore, luck);
			if (luckCount >= 2) {
				var giveupPositionTemp = [];
				for (var j = 0; j < giveupPosition.length; j++) {
					giveupPositionTemp.push(parseInt(giveupPosition[j])+1);
				}
				$("#results").append("<span style='color:gray;display:block'>" + giveupPositionTemp + "号位放弃：" + tempS + "=" + tempScore + "</span><br/>");
				console.info(tempS + "=" + tempScore);
				console.info("giveup:" + giveupPosition);
				result.push(tempScore);
				result.push(maxPosition);
				result.push(giveupPosition);
				results.push(result);
				result = [];
				maxPosition = [];
			}
			giveupPosition = [];
			
			if (recovers.length > 0) {
				for (var j = 0; j < recovers.length; j++) {
					var t = recovers[j];
					nArr[t[0]] = t[1];
				}
			}
		}
		
		//使用一张满分券
		if (quan > 0) {
			for (var i = 0; i < allGroup.length; i++) {
				var recovers = [];
				var g = allGroup[i]
				for (var j = 0; j < g.length; j++) {
					giveupPosition.push(parseInt(g.charAt(j))-1);
					var index = parseInt(g.charAt(j))-1;
					var tempJ = nArr[index];
					var recover = [];
					recover.push(index);
					recover.push(tempJ);
					recovers.push(recover);
					
					nArr[index] = nGArr[index];
				}
				
				for (var j = 0; j < nArr.length; j++) {
					var recovers2 = [];
					if (g.indexOf((j+1) + "") == -1) {
						maxPosition.push(j);
						var tempJ = nArr[j];
						var recover2 = [];
						recover2.push(j);
						recover2.push(tempJ);
						recovers2.push(recover2);
						
						nArr[j] = nMaxArr[j];
						
						var tempS = nArr[0] + m1 + nArr[1] + m2 + nArr[2] + m3 + nArr[3] + m4 + nArr[4] + m5 + nArr[5] + m6 + nArr[6];
						var tempScore = getScore(tempS);
						var luckCount = getCount(tempScore, luck);
						if (luckCount >= 2) {
							var giveupPositionTemp = [];
							for (var k = 0; k < giveupPosition.length; k++) {
								giveupPositionTemp.push(parseInt(giveupPosition[k])+1);
							}
							$("#results").append("<span style='color:#FF8C00;display:block'>" + (maxPosition[0]+1) + "号位使用满分券、" + giveupPositionTemp + "号位放弃：" + tempS + "=" + tempScore + "</span><br/>");
							console.info(tempS + "=" + tempScore);
							console.info("giveup:" + giveupPosition + ";max:" + maxPosition);
							result.push(tempScore);
							result.push(maxPosition);
							result.push(giveupPosition);
							results.push(result);
							result = [];
						}
						maxPosition = [];
						
						if (recovers2.length > 0) {
							for (var k = 0; k < recovers2.length; k++) {
								var t = recovers2[k];
								nArr[t[0]] = t[1];
							}
						}
					}
				}
				giveupPosition = [];
				
				if (recovers.length > 0) {
					for (var j = 0; j < recovers.length; j++) {
						var t = recovers[j];
						nArr[t[0]] = t[1];
					}
				}
			}
		}
		
		//使用二张满分券
		if (quan == 2) {
			for (var i = 0; i < allGroup.length; i++) {
				var recovers = [];
				var g = allGroup[i]
				for (var j = 0; j < g.length; j++) {
					giveupPosition.push(parseInt(g.charAt(j))-1);
					var index = parseInt(g.charAt(j))-1;
					var tempJ = nArr[index];
					var recover = [];
					recover.push(index);
					recover.push(tempJ);
					recovers.push(recover);
					
					nArr[index] = nGArr[index];
				}
				for (var j = 0; j < nArr.length; j++) {
					if (g.indexOf((j+1) + "") == -1) {
						for (var k = j+1; k < nArr.length; k++) {
							var recovers2 = [];
							if (g.indexOf((k+1) + "") == -1) {
								maxPosition.push(j);
								maxPosition.push(k);
								var tempJ1 = nArr[j];
								var tempJ2 = nArr[k];
								var recover2 = [];
								recover2.push(j);
								recover2.push(tempJ1);
								recovers2.push(recover2);
								recover2 = [];
								recover2.push(k);
								recover2.push(tempJ2);
								recovers2.push(recover2);
								
								nArr[j] = nMaxArr[j];
								nArr[k] = nMaxArr[k];
								
								var tempS = nArr[0] + m1 + nArr[1] + m2 + nArr[2] + m3 + nArr[3] + m4 + nArr[4] + m5 + nArr[5] + m6 + nArr[6];
								var tempScore = getScore(tempS);
								var luckCount = getCount(tempScore, luck);
								
								if (luckCount >= 2) {
									var giveupPositionTemp = [];
									for (var l = 0; l < giveupPosition.length; l++) {
										giveupPositionTemp.push(parseInt(giveupPosition[l])+1);
									}
									$("#results").append("<span style='color:#FF8C00;display:block'>" + (maxPosition[0]+1) + "," + (maxPosition[1]+1) + "号位使用满分券、" + giveupPositionTemp + "号位放弃：" + tempS + "=" + tempScore + "</span><br/>");
									console.info(tempS + "=" + tempScore);
									console.info("giveup:" + giveupPosition + ";max:" + maxPosition);
									result.push(tempScore);
									result.push(maxPosition);
									result.push(giveupPosition);
									results.push(result);
									result = [];
								}
								maxPosition = [];
								
								if (recovers2.length > 0) {
									for (var l = 0; l < recovers2.length; l++) {
										var t = recovers2[l];
										nArr[t[0]] = t[1];
									}
								}
							}
						}
					}
				}
				if (recovers.length > 0) {
					for (var j = 0; j < recovers.length; j++) {
						var t = recovers[j];
						nArr[t[0]] = t[1];
					}
				}
				giveupPosition = [];
				console.info(nArr);
			}
		}
	}
	//★★★★★算法结束★★★★★
	
	console.info(results);
	if (results.length == 0) {
		$("#tip").css("display", "block");
		$("#tip").css("color", "red");
		$("#tip").text("当前组合无法命中2个幸运数字，请更改条件或进入游戏刷新");
	} else {
		var maxS = 0;
		var maxIndex = 0;
		for (var i = 0; i < results.length; i++) {
			var t = results[i];
			t = parseInt(t[0]);
			if (t > maxS) {
				maxS = t;
				maxIndex = i;
			}
		}
		$("#later").text(maxS);
		
		$("#tip").css("display", "block");
		$("#tip").css("color", "blue");
		
		var t = results[maxIndex];
		if (t[1].length > 0 && t[2].length == 0) {
			var p = [];
			for (var i = 0; i < t[1].length; i++) {
				$("#n" + (t[1][i]+1)).css("background-color", "#FF5151");
				p[i] = t[1][i]+1;
			}
			$("#tip").text("最高分方案：" + p + "号位使用满分券，" + t[0] + "分");
		}
		if (t[2].length > 0 && t[1].length == 0) {
			var p = [];
			for (var i = 0; i < t[2].length; i++) {
				$("#n" + (t[2][i]+1) + "g").css("background-color", "gray");
				p[i] = t[2][i]+1;
			}
			$("#tip").text("最高分方案：" + p + "号位放弃，" + t[0] + "分");
		}
		if (t[2].length > 0 && t[1].length > 0) {
			var p1 = [];
			for (var i = 0; i < t[2].length; i++) {
				$("#n" + (t[2][i]+1) + "g").css("background-color", "gray");
				p1[i] = t[2][i]+1;
			}
			var p2 = [];
			for (var i = 0; i < t[1].length; i++) {
				$("#n" + (t[1][i]+1)).css("background-color", "#FF5151");
				p2[i] = t[1][i]+1;
			}
			$("#tip").text("最高分方案：" + p2 + "号位使用满分券，" + p1 + "号位放弃，" + t[0] + "分");
		}
	}
	
	/* -------------- 计算结束 ------------ */
}

//核心递归算法
function giveupRecursion(str, step) {
	var tempArr = [];
	if (step == 0) {
		tempArr.push("");
	}
	for (var i = 0; i < str.length; i++) {
		var s = str.charAt(i);
		var cycArr = giveupRecursion(str.substring(i+1), (step-1));
		for (var j = 0; j < cycArr.length; j++) {
			tempArr.push("" + s + cycArr[j]);
		}
	}
	return tempArr;
}

function max(m) {
	if (m == "+") {
		return jiaMax;
	} else if (m == "-") {
		return jianMax;
	} else if (m == "*") {
		return chengMax;
	} else if (m == "/") {
		return chuMax;
	}
}

function getCount(score, luck) {
	var count = 0;
	var scoreArr = (score + "").split("");
	for (var i = 0; i < scoreArr.length; i++) {
		if (scoreArr[i] == (luck + "")) {
			count++;
		}
	}
	return count;
}

function getScore(str) {
	var r = eval(str);
	var tempArr = ("" + r).split(".");
	return tempArr[0];
}
